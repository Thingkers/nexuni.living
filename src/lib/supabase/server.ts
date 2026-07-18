import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Anon-key client for reading public data (rooms + public profile columns,
// as allowed by RLS) from Server Components. It carries no cookies or user
// session, so the queries are the same for every visitor — which is what
// makes the pages using it safe to prerender/cache (ISR).
//
// Returns null when the env vars are absent (e.g. a local build without
// .env) so callers can degrade to empty data instead of crashing the build.
export function createAnonServerClient(): SupabaseClient | null {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'no-data') return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
