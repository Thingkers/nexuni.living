'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { compressImage } from '@/lib/compressImage'
import { supabase } from '@/lib/supabase'
import type { Profile, Room } from '@/types'

type Tab = 'info' | 'rooms'

// Editable text fields on the profile form — typed as a const tuple so
// `field.key` narrows to a literal keyof Profile instead of a bare string,
// which lets us index `profile[field.key]` safely without `any`.
const EDITABLE_FIELDS = [
  { key: 'full_name',    label: 'Full Name',       type: 'text' },
  { key: 'phone',        label: 'Phone Number',    type: 'text' },
  { key: 'university',   label: 'University',      type: 'text' },
  { key: 'bkash_number', label: 'bKash Number (for payment)', type: 'text' },
  { key: 'nagad_number', label: 'Nagad Number (for payment)', type: 'text' },
] as const satisfies readonly { key: keyof Profile; label: string; type: string }[]

function ProfilePageContent() {

  const router = useRouter()
  const searchParams = useSearchParams()

  const [tab, setTab]             = useState<Tab>(() => (searchParams.get('tab') === 'rooms' ? 'rooms' : 'info'))
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [myRooms, setMyRooms]     = useState<Room[]>([])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [userId, setUserId]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [pageError, setPageError] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

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
      ] = await Promise.all([
        supabase.rpc('get_my_profile').maybeSingle(),
        supabase.from('rooms').select('*').eq('owner_id', uid).order('created_at', { ascending: false }),
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

      const typedProfile = profileData as Profile
      setProfile(typedProfile)
      setIsVerified(typedProfile.verification_status === 'approved')
      setMyRooms((roomData ?? []) as Room[])
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
    if (error) { toast.error(error.message); return }
    toast.success('Profile saved!')
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Avatar upload failed'
      setPageError(message)
    } finally {
      setAvatarUploading(false)
    }
  }

  async function toggleRoomStatus(room: Room) {
    const nextStatus = room.status === 'open' ? 'closed' : 'open'
    setTogglingId(room.id)
    const { error } = await supabase.from('rooms').update({ status: nextStatus }).eq('id', room.id)
    setTogglingId(null)
    if (error) { toast.error(error.message); return }
    setMyRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, status: nextStatus } : r))
    toast.success(`Room marked as ${nextStatus}`)
  }

  async function deleteRoom(id: string) {
    setDeleting(true)
    const { error } = await supabase.from('rooms').delete().eq('id', id)
    setDeleting(false)
    if (error) { toast.error(error.message); return }
    setMyRooms((rooms) => rooms.filter((room) => room.id !== id))
    setConfirmDeleteId(null)
    toast.success('Listing deleted')
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
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-semibold text-teal-700">
            {initials}
            {/* hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-white">Add</span>
            </div>
          </div>
        )}
        <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white">
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
          { key: 'info',  label: 'Profile' },
          { key: 'rooms', label: `My Rooms (${myRooms.length})` },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as Tab)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === item.key
                ? 'border-teal-500 text-teal-600'
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
          {EDITABLE_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs text-gray-500">{field.label}</label>
              <input
                type={field.type}
                value={profile[field.key] ?? ''}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
              />
            </div>
          ))}

          <div className="rounded-xl bg-teal-50 px-4 py-3 text-xs text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
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
            className="rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
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
              <Link href="/post-room" className="rounded-xl bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700">
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
                  <div className="ml-3 flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      onClick={() => toggleRoomStatus(room)}
                      disabled={togglingId === room.id}
                      title="Toggle open/closed"
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        room.status === 'open' ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : room.status === 'partial' ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                        : room.status === 'booked' ? 'bg-red-50 text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {togglingId === room.id ? '...' : room.status === 'open' ? '🟢 Open' : room.status === 'partial' ? '🟡 Partial' : room.status === 'booked' ? '🔴 Booked' : '⛔ Closed'}
                    </button>
                    <Link href={`/listings/${room.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">View</Link>
                    <Link href={`/listings/${room.id}/edit`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Edit</Link>
                    {confirmDeleteId === room.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteRoom(room.id)} disabled={deleting} className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50">{deleting ? '...' : 'Sure?'}</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(room.id)} className="px-2 text-xs text-red-400 hover:text-red-600">Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


    </main>

  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-2xl px-4 py-10 animate-pulse">
        <div className="mb-4 h-20 w-20 rounded-full bg-gray-100" />
        <div className="mb-2 h-5 w-1/3 rounded bg-gray-100" />
        <div className="h-4 w-1/4 rounded bg-gray-100" />
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  )
}