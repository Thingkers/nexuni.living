'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'
import type { Booking, Profile, Room } from '@/types'

type Tab = 'info' | 'rooms' | 'bookings'

const BOOKING_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700' },
  confirmed: { label: 'Confirmed', className: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-600' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-600' },
}

export default function ProfilePage() {
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('info')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myRooms, setMyRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    async function loadProfileData() {
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData.user) {
        router.push('/auth/login')
        return
      }

      const uid = userData.user.id
      setUserId(uid)

      const [
        { data: profileData, error: profileError },
        { data: roomData },
        { data: bookingData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase
          .from('rooms')
          .select('*')
          .eq('owner_id', uid)
          .order('created_at', { ascending: false }),
        supabase
          .from('bookings')
          .select('*, rooms(title, rent, location_name)')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
      ])

      if (profileError) {
        setPageError(profileError.message)
        setLoading(false)
        return
      }

      if (!profileData) {
        setPageError('Profile data not found. Please register again or create a profile row.')
        setLoading(false)
        return
      }

      setProfile(profileData as Profile)
      setMyRooms((roomData ?? []) as Room[])
      setBookings(bookingData ?? [])
      setLoading(false)
    }

    loadProfileData()
  }, [router])

  async function saveProfile() {
    if (!profile || !userId) return

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        university: profile.university,
      })
      .eq('id', userId)

    setSaving(false)

    if (error) {
      setPageError(error.message)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function deleteRoom(id: string) {
    const confirmed = confirm('Are you sure you want to delete this listing?')
    if (!confirmed) return

    const { error } = await supabase.from('rooms').delete().eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    setMyRooms((rooms) => rooms.filter((room) => room.id !== id))
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 animate-pulse">
        <div className="mb-4 h-20 w-20 rounded-full bg-gray-100" />
        <div className="mb-2 h-5 w-1/3 rounded bg-gray-100" />
        <div className="h-4 w-1/4 rounded bg-gray-100" />
      </div>
    )
  }

  if (pageError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {pageError}
        </div>
      </main>
    )
  }

  if (!profile) return null

  const initials =
    profile.full_name
      ?.split(' ')
      .map((name: string) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U'

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
          {initials}
        </div>

        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {profile.full_name || 'User'}
          </h1>
          <p className="text-sm text-gray-400">
            {profile.university || 'University not added'}
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-100">
        {[
          { key: 'info', label: 'Profile' },
          { key: 'rooms', label: `My Listings (${myRooms.length})` },
          { key: 'bookings', label: `Bookings (${bookings.length})` },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as Tab)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === item.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="flex flex-col gap-4">
          {[
            { key: 'full_name', label: 'Full Name', type: 'text' },
            { key: 'phone', label: 'Phone Number', type: 'text' },
            { key: 'university', label: 'University', type: 'text' },
          ].map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs text-gray-500">
                {field.label}
              </label>

              <input
                type={field.type}
                value={(profile as any)[field.key] ?? ''}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    [field.key]: event.target.value,
                  } as Profile)
                }
              />
            </div>
          ))}

          <div>
            <label className="mb-1 block text-xs text-gray-500">Email</label>
            <input
              disabled
              value={profile.email ?? ''}
              className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-400">
              Email cannot be changed
            </p>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved successfully' : 'Save Changes'}
          </button>
        </div>
      )}

      {tab === 'rooms' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">{myRooms.length} listings</p>

            <Link
              href="/post-room"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              + New Listing
            </Link>
          </div>

          {myRooms.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="mb-3 text-4xl">🏠</p>
              <p className="text-sm">You have not posted any listings yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 hover:border-gray-200"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {room.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      ৳{room.rent}/month · {room.location_name}
                    </p>
                  </div>

                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        room.status === 'open'
                          ? 'bg-green-50 text-green-700'
                          : room.status === 'partial'
                            ? 'bg-yellow-50 text-yellow-700'
                            : room.status === 'booked'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {room.status === 'open'
                        ? 'Open'
                        : room.status === 'partial'
                          ? 'Partial'
                          : room.status === 'booked'
                            ? 'Booked'
                            : 'Closed'}
                    </span>

                    <Link
                      href={`/listings/${room.id}`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      View
                    </Link>

                    <Link
                      href={`/listings/${room.id}/edit`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => deleteRoom(room.id)}
                      className="px-2 text-xs text-red-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div>
          {bookings.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="mb-3 text-4xl">📋</p>
              <p className="text-sm">No booking requests found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bookings.map((booking: Booking & { rooms?: Room }) => {
                const status =
                  BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.pending

                return (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-gray-100 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {booking.rooms?.title}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-400">
                          ৳{booking.rooms?.rent}/month ·{' '}
                          {booking.rooms?.location_name}
                        </p>

                        {booking.move_in_date && (
                          <p className="mt-1 text-xs text-gray-400">
                            🗓 Move-in date:{' '}
                            {new Date(booking.move_in_date).toLocaleDateString('en-US')}
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {booking.message && (
                      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
                        “{booking.message}”
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </main>
  )
}