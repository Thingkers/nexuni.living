import { supabase } from '@/lib/supabase'
import type { AdminModuleKey } from '@/config/modules'

// Generalizes post-room's uploadRoomImages for the shared `listings` table.
// One bucket (content-images) instead of one per module — see
// docs/module-verticals-roadmap.md Sprint 4 for why. The listing row must
// already exist (owner_id set) before calling this, same two-step pattern
// as post-room: insert with images: [], upload, then update with the URLs.
export async function uploadContentImages(
  module: AdminModuleKey,
  listingId: string,
  images: File[],
): Promise<string[]> {
  const urls: string[] = []
  for (const image of images) {
    const filePath = `${module}/${listingId}/${crypto.randomUUID()}.webp`
    const { error } = await supabase.storage
      .from('content-images')
      .upload(filePath, image, { contentType: 'image/webp' })
    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from('content-images').getPublicUrl(filePath)
    urls.push(data.publicUrl)
  }
  return urls
}
