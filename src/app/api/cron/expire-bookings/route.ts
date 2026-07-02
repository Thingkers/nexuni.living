import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  // Vercel Cron sends: Authorization: Bearer {CRON_SECRET}
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // expire_stale_bookings() expires holds + reopens rooms in a single
  // transaction on the DB side — see supabase/migrations for why this
  // replaced the old per-booking JS loop.
  const { data: expiredCount, error } = await supabaseAdmin.rpc('expire_stale_bookings')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true, expired: expiredCount ?? 0 })
}
