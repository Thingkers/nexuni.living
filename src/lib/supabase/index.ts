import { createBrowserClient } from '@supabase/ssr'

export const isNoDataMode = process.env.NEXT_PUBLIC_APP_MODE === 'no-data'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (isNoDataMode ? 'http://127.0.0.1:54321' : '')
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (isNoDataMode ? 'no-data-placeholder' : '')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuration is missing. Use `npm run dev:no-data` for UI-only local development.',
  )
}

// Uses cookie-based session storage (via @supabase/ssr) instead of the
// default localStorage storage that plain `createClient` from
// @supabase/supabase-js uses. This is required so that the session is
// visible to src/proxy.ts (middleware), which runs on the server and can
// only read cookies — not localStorage. Without this, the client and the
// middleware see two different, unsynced sessions, which causes random
// 401s and the middleware redirecting a "logged in" user back to /auth/login.
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
)