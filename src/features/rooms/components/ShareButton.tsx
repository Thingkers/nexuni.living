'use client'

import { useState } from 'react'

type Props = {
  title: string
  rent: number
  location: string | null
  roomId: string
}

export default function ShareButton({ title, rent, location, roomId }: Props) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/listings/${roomId}`
      : `/listings/${roomId}`

  const text = `🏠 ${title}
📍 ${location || 'Location not added'}
💰 Rent: ৳${rent.toLocaleString('en-US')}/month

View this room on Student Hostel:`

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // fallback dropdown
      }
    }

    setOpen((prev) => !prev)
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
      '_blank',
    )
    setOpen(false)
  }

  function shareFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'width=600,height=400',
    )
    setOpen(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setOpen(false)

    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="relative">
      <button
        onClick={nativeShare}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        {copied ? '✓ Link copied' : '↗ Share'}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close share menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
            <p className="px-3 py-1.5 text-xs text-gray-400">
              Share this room
            </p>

            <button
              onClick={shareWhatsApp}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-base text-white">
                📱
              </span>
              <span className="font-medium text-gray-800">WhatsApp</span>
            </button>

            <button
              onClick={shareFacebook}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-base text-white">
                👥
              </span>
              <span className="font-medium text-gray-800">Facebook</span>
            </button>

            <div className="my-1 h-px bg-gray-100" />

            <button
              onClick={copyLink}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-base">
                🔗
              </span>
              <span className="font-medium text-gray-800">Copy Link</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}