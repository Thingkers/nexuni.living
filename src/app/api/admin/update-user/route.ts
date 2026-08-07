import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { rateLimit } from '@/lib/rateLimit'
import { profileVerifiedTemplate, profileRejectedTemplate } from '@/lib/email/templates'
import { z } from 'zod'
import { BRAND } from '@/config/brand'

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'toggle-verify', 'toggle-admin']),
})

export async function PATCH(req: NextRequest) {
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

  // 60 actions per minute per admin
  const { allowed } = await rateLimit(`admin-update:${caller.id}`, 60, 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { userId, action } = parsed.data

  if (userId === caller.id && action === 'toggle-admin') {
    return NextResponse.json({ error: 'Cannot change your own admin role' }, { status: 400 })
  }

  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role, is_verified, verification_status, email, full_name')
    .eq('id', userId)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let updates: Record<string, unknown> = {}

  if (action === 'approve') {
    updates = { verification_status: 'approved', is_verified: true }
  } else if (action === 'reject') {
    updates = { verification_status: 'rejected', is_verified: false }
  } else if (action === 'toggle-verify') {
    const next = !target.is_verified
    updates = { is_verified: next, verification_status: next ? 'approved' : 'pending' }
  } else if (action === 'toggle-admin') {
    updates = { role: target.role === 'admin' ? 'student' : 'admin' }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send verification email (best-effort — don't fail the action if email fails)
  if ((action === 'approve' || action === 'reject') && target.email && process.env.RESEND_API_KEY) {
    const isApproved = action === 'approve'
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? `${BRAND.emailFromName} <onboarding@resend.dev>`,
        to: target.email,
        subject: isApproved ? 'Your account has been verified ✅' : 'Verification update for your account',
        html: isApproved
          ? profileVerifiedTemplate({ userName: target.full_name })
          : profileRejectedTemplate({ userName: target.full_name }),
      })
    } catch {
      // Email failure is non-fatal
    }
  }

  return NextResponse.json({ success: true, updates })
}
