import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rateLimit'

// Mints short-lived signed URLs for student ID cards, for admins only.
//
// The `student-id-cards` bucket was public until Sprint 0 (see
// supabase/migrations/20260806123000_private_student_id_cards_bucket.sql):
// every card was readable by anyone who could guess the path, and the path
// was `<profile-uuid>/id-card.webp` with the uuid list available from the
// anon-readable profiles endpoint. With the bucket private there is no
// unsigned read path left, so admin verification needs signed URLs — and
// minting them requires the service-role key, which means it has to happen
// on the server. Hence this route rather than a client-side call.
//
// Batched (userIds[] -> urls map) rather than one request per card: the
// pending-verification screen renders a thumbnail per user, and a per-card
// round trip would be N requests plus N admin-role lookups per page load.

const BUCKET = 'student-id-cards'

// 5 minutes: long enough to review a queue of pending users without
// re-fetching, short enough that a URL pasted or logged somewhere stops
// working quickly.
const SIGNED_URL_TTL_SECONDS = 300

const schema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
})

// profiles.student_id_card_url has held two shapes over the life of the app:
// a fully-qualified public URL (everything written before Sprint 0) and a
// bare storage path like `<uuid>/<random>.webp` (what the register page
// writes now that there is no public URL to store). Signing needs the path,
// so normalise both here instead of running a data migration over the column
// — the legacy URLs stay valid as a record of where the object lives, they
// just no longer resolve on their own.
function toStoragePath(stored: string): string | null {
  const trimmed = stored.trim()
  if (!trimmed) return null

  const marker = `/${BUCKET}/`
  const markerIndex = trimmed.indexOf(marker)
  if (markerIndex !== -1) {
    // .../object/public/student-id-cards/<uuid>/id-card.webp -> <uuid>/id-card.webp
    const path = trimmed.slice(markerIndex + marker.length)
    return path.split('?')[0] || null
  }

  // Already a bare path. Reject anything that still looks like a URL so a
  // malformed row can't be turned into a request against another host.
  if (/^https?:\/\//i.test(trimmed)) return null
  return trimmed.replace(/^\/+/, '') || null
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

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

  // 120 batches per hour per admin. Generous for real review work, but it
  // stops a compromised admin session from being used to bulk-export every
  // ID card on the platform unattended.
  const { allowed } = await rateLimit(`admin-id-card:${caller.id}`, 120, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, student_id_card_url')
    .in('id', parsed.data.userIds)

  const urls: Record<string, string> = {}

  await Promise.all(
    (profiles ?? []).map(async (profile) => {
      if (!profile.student_id_card_url) return
      const path = toStoragePath(profile.student_id_card_url)
      if (!path) return

      const { data } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

      if (data?.signedUrl) urls[profile.id as string] = data.signedUrl
    }),
  )

  // A card whose object is missing (e.g. purged by
  // 20260806125000_purge_orphaned_student_id_cards.sql) is simply absent from
  // the map rather than an error — the UI renders "No ID card" for it, which
  // is the truthful state.
  return NextResponse.json({ urls })
}
