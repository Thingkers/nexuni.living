import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { BRAND, getSiteUrl } from '@/config/brand'

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const base = getSiteUrl()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: room } = await supabase
    .from('rooms')
    .select('title, rent, location_name, description, images, type, gender_type')
    .eq('id', id)
    .single()

  if (!room) {
    return { title: `Room Not Found | ${BRAND.name}` }
  }

  const typeLabel = room.type === 'mess' ? 'Mess' : room.type === 'bachelor' ? 'Bachelor' : room.type === 'sublet' ? 'Sublet' : 'Room'
  const title = `${room.title} | ৳${room.rent}/month — ${BRAND.name}`
  const description = room.description
    ? room.description.slice(0, 160)
    : `${typeLabel} room in ${room.location_name ?? 'Bangladesh'} for ৳${room.rent}/month.`

  const image = room.images?.[0]

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/listings/${id}`,
      siteName: BRAND.name,
      type: 'article',
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: room.title }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
