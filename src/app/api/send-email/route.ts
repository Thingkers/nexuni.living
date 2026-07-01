import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'
import {
  newMessageTemplate,
  newBookingRequestTemplate,
  bookingConfirmedTemplate,
  bookingRejectedTemplate,
} from '@/lib/email/templates'
import { z } from 'zod'

// Every branch below resolves the recipient email + template content itself
// from the database, keyed only by IDs the client sends. The client never
// controls `to`, `subject`, or `html` directly — that would turn this route
// into an open relay any logged-in user could point at arbitrary addresses.
const schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('new-message'),
    receiverId: z.string().uuid(),
    message: z.string().min(1).max(2000),
  }),
  z.object({
    type: z.literal('new-booking-request'),
    bookingId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('booking-status'),
    bookingId: z.string().uuid(),
    action: z.enum(['confirmed', 'rejected']),
  }),
])

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 10 emails per user per hour
    const { allowed } = await rateLimit(`email:${user.id}`, 10, 60 * 60 * 1000)
    if (!allowed) {
      return Response.json({ error: 'Too many requests. Please wait before sending more emails.' }, { status: 429 })
    }

    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    let to: string | null | undefined
    let subject = ''
    let html = ''

    if (parsed.data.type === 'new-message') {
      const { receiverId, message } = parsed.data

      const { data: receiver } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', receiverId)
        .single()

      if (!receiver?.email) {
        return Response.json({ error: 'Recipient not found' }, { status: 404 })
      }

      to = receiver.email
      subject = 'New message on Student Hostel'
      html = newMessageTemplate({
        receiverName: receiver.full_name,
        senderName: callerProfile?.full_name,
        message,
        inboxUrl: `${siteUrl}/inbox/${user.id}`,
      })
    } else if (parsed.data.type === 'new-booking-request') {
      const { bookingId } = parsed.data

      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('user_id, move_in_date, message, rooms(title, owner_id)')
        .eq('id', bookingId)
        .single()

      const room = Array.isArray(booking?.rooms) ? booking.rooms[0] : booking?.rooms

      if (!booking || booking.user_id !== user.id || !room) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: owner } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', room.owner_id)
        .single()

      if (!owner?.email) {
        return Response.json({ error: 'Recipient not found' }, { status: 404 })
      }

      to = owner.email
      subject = 'New Booking Request 📩'
      html = newBookingRequestTemplate({
        ownerName: owner.full_name,
        tenantName: callerProfile?.full_name,
        roomTitle: room.title,
        moveInDate: booking.move_in_date,
        tenantMessage: booking.message,
        bookingsUrl: `${siteUrl}/dashboard/bookings`,
      })
    } else {
      const { bookingId, action } = parsed.data

      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('user_id, rooms(title, location_name, owner_id)')
        .eq('id', bookingId)
        .single()

      const room = Array.isArray(booking?.rooms) ? booking.rooms[0] : booking?.rooms

      if (!booking || !room || room.owner_id !== user.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: tenant } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', booking.user_id)
        .single()

      if (!tenant?.email) {
        return Response.json({ error: 'Recipient not found' }, { status: 404 })
      }

      to = tenant.email
      subject = action === 'confirmed'
        ? 'Your booking has been confirmed 🎉'
        : 'Update on your booking request'
      html = action === 'confirmed'
        ? bookingConfirmedTemplate({ userName: tenant.full_name, roomTitle: room.title, roomLocation: room.location_name })
        : bookingRejectedTemplate({ userName: tenant.full_name, roomTitle: room.title, roomLocation: room.location_name })
    }

    if (!to) {
      return Response.json({ error: 'Recipient not found' }, { status: 404 })
    }

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Student Hostel <onboarding@resend.dev>',
      to,
      subject,
      html,
    })

    return Response.json(data)
  } catch {
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
