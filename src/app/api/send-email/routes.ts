import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  try {
    // Require a logged-in user to send emails
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
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
