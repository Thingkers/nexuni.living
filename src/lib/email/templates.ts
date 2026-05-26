export function bookingConfirmedTemplate({
  userName,
  roomTitle,
  roomLocation,
}: {
  userName?: string | null
  roomTitle: string
  roomLocation?: string | null
}) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc;">
      <div style="max-width: 560px; margin: auto; background: white; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">

        <h1 style="margin: 0 0 12px; color: #111827;">
          Booking Confirmed 🎉
        </h1>

        <p style="color: #4b5563; line-height: 1.7;">
          Hello ${userName || 'Student'},
        </p>

        <p style="color: #4b5563; line-height: 1.7;">
          Your booking request has been confirmed successfully.
        </p>

        <div style="margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 12px;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #111827;">
            ${roomTitle}
          </p>

          ${
            roomLocation
              ? `
            <p style="margin: 0; color: #6b7280;">
              📍 ${roomLocation}
            </p>
          `
              : ''
          }
        </div>

        <p style="color: #4b5563; line-height: 1.7;">
          Please contact the owner for further details.
        </p>

        <a
          href="http://localhost:3000/profile"
          style="
            display: inline-block;
            margin-top: 20px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            padding: 12px 18px;
            border-radius: 10px;
            font-weight: 600;
          "
        >
          View Booking
        </a>

        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">
          Student Hostel Platform
        </p>
      </div>
    </div>
  `
}

export function newMessageTemplate({
  receiverName,
  senderName,
  message,
  inboxUrl,
}: {
  receiverName?: string | null
  senderName?: string | null
  message: string
  inboxUrl: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc;">
      <div style="max-width: 560px; margin: auto; background: white; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
        <h1 style="margin: 0 0 12px; color: #111827;">
          New Message 💬
        </h1>

        <p style="color: #4b5563; line-height: 1.7;">
          Hello ${receiverName || 'there'},
        </p>

        <p style="color: #4b5563; line-height: 1.7;">
          ${senderName || 'Someone'} sent you a new message.
        </p>

        <div style="margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 12px; color: #374151;">
          ${message}
        </div>

        <a
          href="${inboxUrl}"
          style="display: inline-block; margin-top: 20px; background: #2563eb; color: white; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;"
        >
          Reply Now
        </a>

        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">
          Student Hostel Platform
        </p>
      </div>
    </div>
  `
}