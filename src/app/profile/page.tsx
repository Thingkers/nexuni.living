'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/compressImage'
import { supabase } from '@/lib/supabase'
import type { Booking, Profile, Room } from '@/types'
import RoomCard from '@/features/rooms/components/RoomCard'
import BookingTimeline from '@/features/bookings/components/BookingTimeline'
import BookingCountdown from '@/features/bookings/components/BookingCountdown'

type Tab = 'info' | 'rooms' | 'bookings' | 'saved'

const BOOKING_STATUS: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-yellow-50 text-yellow-700' },
  confirmed: { label: 'Confirmed', className: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-600' },
  rejected:  { label: 'Rejected',  className: 'bg-red-50 text-red-600' },
}

export default function ProfilePage() {

  const router = useRouter()

  const [tab, setTab]             = useState<Tab>('info')
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [myRooms, setMyRooms]     = useState<Room[]>([])
  const [bookings, setBookings]   = useState<any[]>([])
  const [savedRooms, setSavedRooms] = useState<any[]>([])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [userId, setUserId]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [pageError, setPageError] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

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
        { data: savedData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('rooms').select('*').eq('owner_id', uid).order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, rooms(title, rent, location_name, owner_id, profiles(full_name, phone, bkash_number, nagad_number))').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('saved_rooms').select('*, rooms(*, profiles(full_name, avatar_url))').eq('user_id', uid).order('created_at', { ascending: false }),
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
      setIsVerified(profileData.verification_status === 'approved')
      setMyRooms((roomData ?? []) as Room[])
      setBookings(bookingData ?? [])
      setSavedRooms((savedData ?? []).map((item: any) => item.rooms))
      setLoading(false)
    }

    loadProfileData()
  }, [router])

  async function saveProfile() {
    if (!profile || !userId) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name, phone: profile.phone, university: profile.university, bkash_number: profile.bkash_number, nagad_number: profile.nagad_number })
      .eq('id', userId)

    setSaving(false)
    if (error) { setPageError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }


  

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file || !userId) return

  setAvatarUploading(true)

  try {
    const compressed = await compressImage(file)

    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, compressed, { upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId)

    if (updateError) throw new Error(updateError.message)

    setProfile((prev) => prev ? { ...prev, avatar_url: data.publicUrl } : prev)
  } catch (err: any) {
    setPageError(err.message)
  } finally {
    setAvatarUploading(false)
  }
}





  async function deleteRoom(id: string) {
    const confirmed = confirm('Are you sure you want to delete this listing?')
    if (!confirmed) return
    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) { alert(error.message); return }
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{pageError}</div>
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

        <label className="relative cursor-pointer group">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
          disabled={avatarUploading}
        />
        {profile.avatar_url ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-full">
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
            {/* hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-white">Change</span>
            </div>
          </div>
        ) : (
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
            {initials}
            {/* hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-white">Add</span>
            </div>
          </div>
        )}
        <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
          {avatarUploading ? (
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          )}
        </div>
      </label>


        <div>

          <h1 className="text-xl font-semibold text-gray-900">{profile.full_name || 'User'}</h1>
          <p className="text-sm text-gray-400">{profile.university || 'University not added'}</p>
          {!isVerified && (
            <span className="mt-1 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-600">
              ⏳ Verification Pending
            </span>
          )}
          {isVerified && (
            <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600">
              ✓ Verified
            </span>
          )}
        </div>

      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-100">
        {[
          { key: 'info',     label: 'Profile' },
          { key: 'rooms',    label: `My Listings (${myRooms.length})` },
          { key: 'bookings', label: `Bookings (${bookings.length})` },
          { key: 'saved',    label: `Saved (${savedRooms.length})` },
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

      {/* PROFILE INFO */}
      {tab === 'info' && (
        <div className="flex flex-col gap-4">
          {[
            { key: 'full_name',    label: 'Full Name',       type: 'text' },
            { key: 'phone',        label: 'Phone Number',    type: 'text' },
            { key: 'university',   label: 'University',      type: 'text' },
            { key: 'bkash_number', label: 'bKash Number (for payment)', type: 'text' },
            { key: 'nagad_number', label: 'Nagad Number (for payment)', type: 'text' },
          ].map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs text-gray-500">{field.label}</label>
              <input
                type={field.type}
                value={(profile as any)[field.key] ?? ''}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value } as Profile)}
              />
            </div>
          ))}

          <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            💡 Add your bKash/Nagad number so tenants can send payment after booking confirmation.
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Email</label>
            <input
              disabled
              value={profile.email ?? ''}
              className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
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

      {/* MY LISTINGS */}
      {tab === 'rooms' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">{myRooms.length} listings</p>

            {/* ✅ Only verified users can post */}
            {isVerified ? (
              <Link href="/post-room" className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                + New Listing
              </Link>
            ) : (
              <span className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-400 cursor-not-allowed">
                + New Listing
              </span>
            )}
          </div>

          {!isVerified && (
            <div className="mb-4 rounded-xl bg-yellow-50 px-4 py-3 text-xs text-yellow-700">
              ⏳ Account verify হলে room post করতে পারবেন।
            </div>
          )}

          {myRooms.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="mb-3 text-4xl">🏠</p>
              <p className="text-sm">You have not posted any listings yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 hover:border-gray-200">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{room.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">৳{room.rent}/month · {room.location_name}</p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      room.status === 'open' ? 'bg-green-50 text-green-700'
                      : room.status === 'partial' ? 'bg-yellow-50 text-yellow-700'
                      : room.status === 'booked' ? 'bg-red-50 text-red-600'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {room.status === 'open' ? 'Open' : room.status === 'partial' ? 'Partial' : room.status === 'booked' ? 'Booked' : 'Closed'}
                    </span>
                    <Link href={`/listings/${room.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">View</Link>
                    <Link href={`/listings/${room.id}/edit`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Edit</Link>
                    <button onClick={() => deleteRoom(room.id)} className="px-2 text-xs text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BOOKINGS */}
      {tab === 'bookings' && (
        <div>
          {!isVerified ? (
            <div className="py-16 text-center text-gray-400">
              <p className="mb-3 text-4xl">⏳</p>
              <p className="text-sm">Account verify হলে booking দেখতে পারবেন।</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="mb-3 text-4xl">📋</p>
              <p className="text-sm">No booking requests found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bookings.map((booking: any) => {
                const status = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.pending
                const ownerProfile = booking.rooms?.profiles
                const hasBkash = ownerProfile?.bkash_number
                const hasNagad = ownerProfile?.nagad_number
                const hasPayment = hasBkash || hasNagad
                return (
                  <div key={booking.id} className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 dark:bg-gray-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{booking.rooms?.title}</p>
                        <p className="mt-0.5 text-xs text-gray-400">৳{booking.rooms?.rent}/month · {booking.rooms?.location_name}</p>
                        {booking.move_in_date && (
                          <p className="mt-1 text-xs text-gray-400">🗓 Move-in date: {new Date(booking.move_in_date).toLocaleDateString('en-US')}</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                    </div>

                    {booking.status === 'confirmed' && hasPayment && (
                      <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                        <p className="mb-2 text-xs font-semibold text-green-800 dark:text-green-400">💸 Payment Info</p>
                        <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">Send your advance/first-month rent to the owner:</p>
                        <div className="flex flex-col gap-1.5">
                          {hasBkash && (
                            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                              <span className="text-xs font-medium text-pink-600">📱 bKash</span>
                              <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">{ownerProfile.bkash_number}</span>
                            </div>
                          )}
                          {hasNagad && (
                            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                              <span className="text-xs font-medium text-orange-600">📱 Nagad</span>
                              <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">{ownerProfile.nagad_number}</span>
                            </div>
                          )}
                          {ownerProfile?.phone && (
                            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                              Contact owner: <a href={`tel:${ownerProfile.phone}`} className="text-blue-600 hover:underline">{ownerProfile.phone}</a>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {booking.status === 'confirmed' && !hasPayment && (
                      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        ✅ Booking confirmed! Contact the owner to arrange payment.
                        {ownerProfile?.phone && (
                          <a href={`tel:${ownerProfile.phone}`} className="ml-1 font-medium underline">{ownerProfile.phone}</a>
                        )}
                      </div>
                    )}

                    <BookingTimeline bookingId={booking.id} />
                    {booking.status === 'confirmed' && booking.expires_at && (
                      <div className="mt-2">
                        <BookingCountdown expiresAt={booking.expires_at} />
                        <Link href={`/inbox/${booking.rooms?.owner_id}`} className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                          💬 Message Owner
                        </Link>
                      </div>
                    )}
                    {booking.message && (
                      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400 dark:bg-gray-700">"{booking.message}"</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SAVED */}
      {tab === 'saved' && (
        <div>
          {savedRooms.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="mb-3 text-4xl">❤️</p>
              <p className="text-sm">No saved rooms yet</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {savedRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      )}

    </main>

  )
}
