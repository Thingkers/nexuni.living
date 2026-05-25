'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'

type Props = {
  roomId: string
}

const REASONS = [
  'Fake listing',
  'Wrong information',
  'Already booked',
  'Inappropriate content',
  'Other',
]

export default function ReportListingButton({ roomId }: Props) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitReport() {
    setLoading(true)

    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
      setLoading(false)
      router.push('/auth/login')
      return
    }

    const { error } = await supabase.from('reports').insert({
      room_id: roomId,
      reporter_id: authData.user.id,
      reason,
      details,
    })

    setLoading(false)

    if (error) {
      if (error.code === '23505') {
        toast.error('You have already reported this listing')
      } else {
        toast.error(error.message)
      }
      return
    }

    toast.success('Report submitted successfully')
    setOpen(false)
    setDetails('')
    setReason(REASONS[0])
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-red-100 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50"
      >
        Report Listing
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Report Listing
                </h2>
                <p className="text-sm text-gray-400">
                  Tell us what is wrong with this listing.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-gray-500">
                Reason
              </label>

              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                {REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-gray-500">
                Details
              </label>

              <textarea
                rows={4}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Write more details..."
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={submitReport}
              disabled={loading}
              className="w-full rounded-xl bg-red-500 py-3 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}