import { cache } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Room } from '@/features/rooms/types/room.types'
import ListingClient from './ListingClient'

type Props = {
  params: Promise<{ id: string }>
}

// Full row (not just metadata fields) so the page body renders with the room
// already in the HTML instead of the client re-fetching it after hydration.
// React.cache dedupes the call between generateMetadata and the page render.
const getRoom = cache(async (id: string): Promise<Room | null> => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase
    .from('rooms')
    .select('*, profiles(full_name, phone, avatar_url, university)')
    .eq('id', id)
    .single()
  return data as Room | null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const room = await getRoom(id)

  if (!room) {
    return { title: 'Listing Not Found | Student Hostel' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://student-hostel.vercel.app'
  const genderLabel = room.gender_type === 'male' ? 'Male only' : room.gender_type === 'female' ? 'Female only' : 'Any gender'
  const description = [
    room.location_name ? `📍 ${room.location_name}` : null,
    `৳${room.rent.toLocaleString('en-US')}/month`,
    genderLabel,
    room.description?.slice(0, 100) || null,
  ].filter(Boolean).join(' · ')

  const ogImage = room.images?.[0] ?? null

  return {
    title: `${room.title} | Student Hostel`,
    description,
    openGraph: {
      title: room.title,
      description,
      url: `${siteUrl}/listings/${id}`,
      siteName: 'Student Hostel',
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, width: 1280, height: 720, alt: room.title }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: room.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params
  const room = await getRoom(id)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://student-hostel.vercel.app'

  const jsonLd = room
    ? {
        '@context': 'https://schema.org',
        '@type': 'Accommodation',
        name: room.title,
        description: room.description ?? undefined,
        url: `${siteUrl}/listings/${id}`,
        ...(room.images?.[0] ? { image: room.images[0] } : {}),
        address: room.location_name
          ? { '@type': 'PostalAddress', addressLocality: room.location_name, addressCountry: 'BD' }
          : undefined,
        offers: {
          '@type': 'Offer',
          price: room.rent,
          priceCurrency: 'BDT',
          availability: 'https://schema.org/InStock',
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ListingClient id={id} initialRoom={room} />
    </>
  )
}
