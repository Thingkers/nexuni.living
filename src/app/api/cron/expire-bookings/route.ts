import { createClient } from '@supabase/supabase-js'
import type { RoomType } from '@/features/rooms/types/room.types'
import { isSharedRoom } from '@/features/rooms/types/room.types'

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

  // Find all confirmed bookings whose 24h hold has passed
  const { data: expired, error } = await supabaseAdmin
    .from('bookings')
    .select('id, room_id, seats, rooms(type, available_seats, total_seats)')
    .eq('status', 'confirmed')
    .lt('expires_at', new Date().toISOString())
    .not('expires_at', 'is', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!expired?.length) return Response.json({ success: true, expired: 0 })

  for (const booking of expired) {
    // Mark booking as expired
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'expired' })
      .eq('id', booking.id)

    // Reopen the room
    const roomType = (booking.rooms as any)?.type as RoomType
    if (isSharedRoom(roomType)) {
      const current = (booking.rooms as any)?.available_seats ?? 0
      const total   = (booking.rooms as any)?.total_seats ?? 999
      const restored = Math.min(current + (booking.seats ?? 1), total)
      await supabaseAdmin
        .from('rooms')
        .update({ available_seats: restored, status: restored > 0 ? 'open' : 'booked' })
        .eq('id', booking.room_id)
    } else {
      await supabaseAdmin
        .from('rooms')
        .update({ status: 'open' })
        .eq('id', booking.room_id)
    }
  }

  return Response.json({ success: true, expired: expired.length })
}
