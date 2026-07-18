import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getSiteUrl } from '@/config/brand'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const staticUrls: MetadataRoute.Sitemap = [
    { url: base,                     lastModified: new Date(), changeFrequency: 'daily',   priority: 1 },
    { url: `${base}/listings`,       lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${base}/roommates`,      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/auth/login`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/auth/register`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return staticUrls

  const supabase = createClient(
    supabaseUrl,
    anonKey,
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

  // Small reference tables (dozens of rows) — no .limit() needed, unlike rooms.
  const { data: universities } = await supabase
    .from('universities')
    .select('slug, created_at')
    .eq('is_active', true)

  const universityUrls: MetadataRoute.Sitemap = (universities ?? []).map((u) => ({
    url: `${base}/universities/${u.slug}`,
    lastModified: new Date(u.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const { data: localities } = await supabase
    .from('localities')
    .select('slug, created_at')
    .eq('is_active', true)

  const areaUrls: MetadataRoute.Sitemap = (localities ?? []).map((l) => ({
    url: `${base}/areas/${l.slug}`,
    lastModified: new Date(l.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    ...staticUrls,
    ...universityUrls,
    ...areaUrls,
    ...roomUrls,
  ]
}
