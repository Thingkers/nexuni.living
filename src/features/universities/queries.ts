import type { SupabaseClient } from '@supabase/supabase-js'

// Slugs are a URL-only encoding (?universities=aiub,nsu) — rooms.nearest_university_ids
// stores uuids, so this resolves slugs to ids once server-side (for the
// initial SSR fetch in listings/page.tsx, which has no client-side hook
// access). The client resolves the same way via the already-loaded
// useUniversities() list instead of calling this.
export async function resolveUniversityIdsBySlug(
  supabase: SupabaseClient,
  slugs: string[],
): Promise<string[]> {
  if (slugs.length === 0) return []

  const { data } = await supabase
    .from('universities')
    .select('id, slug')
    .eq('is_active', true)
    .in('slug', slugs)

  return (data ?? []).map((u) => u.id as string)
}
