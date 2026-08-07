import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().uuid(),
})

export async function DELETE(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Server is not configured for admin actions (missing SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 500 },
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 10 deletes per hour per admin
  const { allowed } = await rateLimit(`admin-delete:${caller.id}`, 10, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many delete requests. Please wait.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { userId } = parsed.data

  if (userId === caller.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  // Remove the uploaded identity document before the profile row goes, while
  // the folder name (the user id) is still meaningful. This route used to
  // delete only the profile and the auth user, which is why the audit found
  // 25 objects in student-id-cards against 6 surviving profiles — 19 people
  // had deleted their account and their ID card was still stored, and (until
  // supabase/migrations/20260806123000_private_student_id_cards_bucket.sql)
  // still publicly served. Once the account is gone there is no verification
  // left to perform, so there is no reason to keep the document.
  //
  // Best-effort: a storage failure must not leave a half-deleted account
  // behind, so it is logged and the deletion continues. The pre-existing
  // orphans are cleaned up by
  // supabase/migrations/20260806125000_purge_orphaned_student_id_cards.sql.
  for (const bucket of ['student-id-cards', 'avatars'] as const) {
    try {
      const { data: objects } = await supabaseAdmin.storage.from(bucket).list(userId)
      if (objects && objects.length > 0) {
        await supabaseAdmin.storage
          .from(bucket)
          .remove(objects.map((object) => `${userId}/${object.name}`))
      }
    } catch (storageError) {
      console.error(`[delete-user] failed to clear ${bucket} for ${userId}`, storageError)
    }
  }

  await supabaseAdmin.from('profiles').delete().eq('id', userId)

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
