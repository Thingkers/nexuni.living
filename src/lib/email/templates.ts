export function profileVerifiedTemplate({ userName }: { userName?: string | null }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://student-hostel.vercel.app'
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc;">
      <div style="max-width: 560px; margin: auto; background: white; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
        <h1 style="margin: 0 0 12px; color: #111827;">Account Verified ✅</h1>
        <p style="color: #4b5563; line-height: 1.7;">Hello ${userName || 'Student'},</p>
        <p style="color: #4b5563; line-height: 1.7;">
          Great news! Your student account has been <strong style="color: #059669;">verified</strong> by our admin team.
          You can now post listings, make bookings, and use all platform features.
        </p>
        <a
          href="${siteUrl}/listings"
          style="display: inline-block; margin-top: 20px; background: #0d9488; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600;"
        >
          Browse Rooms
        </a>
        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">Student Hostel Platform</p>
      </div>
    </div>
  `
}

export function profileRejectedTemplate({ userName }: { userName?: string | null }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://student-hostel.vercel.app'
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc;">
      <div style="max-width: 560px; margin: auto; background: white; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
        <h1 style="margin: 0 0 12px; color: #111827;">Verification Update</h1>
        <p style="color: #4b5563; line-height: 1.7;">Hello ${userName || 'Student'},</p>
        <p style="color: #4b5563; line-height: 1.7;">
          Unfortunately, we could not verify your student account at this time.
          This may be due to an unclear or invalid student ID card.
        </p>
        <p style="color: #4b5563; line-height: 1.7;">
          You can update your profile with a clearer image and contact support if you believe this is a mistake.
        </p>
        <a
          href="${siteUrl}/dashboard/profile"
          style="display: inline-block; margin-top: 20px; background: #0d9488; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600;"
        >
          Update Profile
        </a>
        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">Student Hostel Platform</p>
      </div>
    </div>
  `
}

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
          href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://student-hostel.vercel.app'}/profile"
          style="
            display: inline-block;
            margin-top: 20px;
            background: #0d9488;
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

export function bookingRejectedTemplate({
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
        <h1 style="margin: 0 0 12px; color: #111827;">Booking Update</h1>
        <p style="color: #4b5563; line-height: 1.7;">Hello ${userName || 'Student'},</p>
        <p style="color: #4b5563; line-height: 1.7;">
          Unfortunately, your booking request was not accepted by the owner.
        </p>
        <div style="margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 12px;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #111827;">${roomTitle}</p>
          ${roomLocation ? `<p style="margin: 0; color: #6b7280;">📍 ${roomLocation}</p>` : ''}
        </div>
        <p style="color: #4b5563; line-height: 1.7;">
          Don't worry — there are more rooms available. Browse other listings and find your perfect match.
        </p>
        <a
          href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://student-hostel.vercel.app'}/listings"
          style="display: inline-block; margin-top: 20px; background: #0d9488; color: white; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;"
        >
          Browse Other Rooms
        </a>
        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">Student Hostel Platform</p>
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
          style="display: inline-block; margin-top: 20px; background: #0d9488; color: white; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;"
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