import { Resend } from 'resend'

const resend = new Resend(
  process.env.RESEND_API_KEY,
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      to,
      subject,
      html,
    } = body

    const data = await resend.emails.send({
      from: 'Student Hostel <onboarding@resend.dev>',
      to,
      subject,
      html,
    })

    return Response.json(data)
  } catch (error) {
    return Response.json(
      { error },
      { status: 500 },
    )
  }
}