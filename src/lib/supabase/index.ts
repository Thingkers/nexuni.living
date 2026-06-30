import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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