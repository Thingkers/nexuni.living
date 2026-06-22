import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://studenthostel.vercel.app'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, created_at')
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1000)

  const roomUrls: MetadataRoute.Sitemap = (rooms ?? []).map((room) => ({
    url: `${base}/listings/${room.id}`,
    lastModified: new Date(room.created_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [
    { url: base,                     lastModified: new Date(), changeFrequency: 'daily',   priority: 1 },
    { url: `${base}/listings`,       lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${base}/auth/login`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/auth/register`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    ...roomUrls,
  ]
}
