// src/app/users/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type PublicProfile = {
  id: string
  full_name: string | null
  university: string | null
  phone: string | null
  gender: string | null
  avatar_url: string | null
  is_verified: boolean
  created_at: string
}

type PublicRoom = {
  id: string
  title: string
  rent: number
  location_name: string | null
  status: string
  type: string
}

export default function UserProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [rooms, setRooms] = useState<PublicRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // auth check
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const [{ data: profileData }, { data: roomData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, university, phone, gender, avatar_url, is_verified, created_at')
          .eq('id', id)
          .single(),
        supabase
          .from('rooms')
          .select('id, title, rent, location_name, status, type')
          .eq('owner_id', id)
          .neq('status', 'closed')
          .order('created_at', { ascending: false }),
      ])

      setProfile(profileData)
      setRooms(roomData ?? [])
      setLoading(false)
    }

    load()
  }, [id, router])

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 animate-pulse">
        <div className="mb-4 h-16 w-16 rounded-full bg-gray-100" />
        <div className="mb-2 h-5 w-1/3 rounded bg-gray-100" />
        <div className="h-4 w-1/4 rounded bg-gray-100" />
      </div>
    )
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="text-sm text-gray-400">User not found.</p>
      </main>
    )
  }

  const initials = profile.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'U'

  return (
    <main className="mx-auto max-w-lg px-4 py-8">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Back
      </button>

      {/* Profile header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-xl font-semibold text-teal-700">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">{profile.full_name}</h1>
            {profile.is_verified && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-xs text-white">✓</span>
            )}
          </div>
          <p className="text-sm text-gray-400">{profile.university || 'University not added'}</p>
          <p className="text-xs text-gray-400">
            {profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : ''}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">

        {profile.phone && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Phone</span>
            <a href={`tel:${profile.phone}`} className="text-sm font-medium text-teal-600 hover:underline">
              📞 {profile.phone}
            </a>
          </div>
        )}

        {profile.created_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Member since</span>
            <span className="text-sm text-gray-700">
              {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Status</span>
          {profile.is_verified ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">✓ Verified</span>
          ) : (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-600">Pending</span>
          )}
        </div>

      </div>

      {/* Listings */}
      {rooms.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-700">Active Listings ({rooms.length})</h2>
          <div className="flex flex-col gap-2">

            {rooms.map((room) => (
              <a
                key={room.id}
                href={'/listings/' + room.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 hover:border-teal-200 hover:bg-teal-50"
              >
                
                <div>
                  <p className="text-sm font-medium text-gray-900">{room.title}</p>
                  <p className="text-xs text-gray-400">📍 {room.location_name} · ৳{room.rent}/month</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  room.status === 'open' ? 'bg-green-100 text-green-700'
                  : room.status === 'partial' ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
                }`}>
                  {room.status}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
      
    <a
      href={'/inbox/' + profile.id}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700"
      >
        💬 Message
      </a>


    </main>
  )
}