import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

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
    const { allowed } = rateLimit(`email:${user.id}`, 10, 60 * 60 * 1000)
    if (!allowed) {
      return Response.json({ error: 'Too many requests. Please wait before sending more emails.' }, { status: 429 })
    }

    const body = await req.json()
    const { to, subject, html } = body

    if (!to || !subject || !html) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Student Hostel <onboarding@resend.dev>',
      to,
      subject,
      html,
    })

    return Response.json(data)
  } catch (error) {
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
