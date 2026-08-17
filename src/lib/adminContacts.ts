import { supabase } from '@/lib/supabase'

export type UserContact = {
  full_name: string | null
  email: string | null
}

/**
 * Resolve a batch of user ids to their name and email.
 *
 * Admin screens cannot embed `profiles(full_name, email)` any more: Sprint 0
 * narrowed `authenticated`'s SELECT on public.profiles to a 12-column allowlist
 * that excludes `email` (supabase/migrations/20260806122000), and PostgREST
 * fails the entire request when one embedded column is denied — so a single
 * `email` in a select string turns a working admin page into an empty one.
 *
 * The email therefore comes from admin_get_user_contacts(), a SECURITY DEFINER
 * function that does its own authorization
 * (supabase/migrations/20260817120000). It returns zero rows to anyone who is
 * neither a global admin nor a module admin, so an unauthorized caller sees
 * blank emails rather than a failed page.
 *
 * Errors are swallowed on purpose. Email is supporting detail on every screen
 * that uses this — losing it must never take the list with it, which is the
 * exact failure this helper exists to prevent.
 */
export async function fetchUserContacts(
  userIds: (string | null | undefined)[],
): Promise<Record<string, UserContact>> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))))
  if (ids.length === 0) return {}

  const { data, error } = await supabase.rpc('admin_get_user_contacts', {
    p_user_ids: ids,
  })

  if (error) {
    console.error('admin_get_user_contacts failed:', error.message)
    return {}
  }

  const rows = (data ?? []) as { id: string; full_name: string | null; email: string | null }[]

  return Object.fromEntries(
    rows.map((row) => [row.id, { full_name: row.full_name, email: row.email }]),
  )
}
