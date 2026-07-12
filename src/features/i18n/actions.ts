'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { LOCALE_COOKIE, type AppLocale } from '@/i18n/request'

// Sets the NEXT_LOCALE cookie (read by src/i18n/request.ts on every
// subsequent request) and, for logged-in users, mirrors the choice into
// profiles.locale so it follows them across devices/browsers. Called from
// the Navbar's language toggle, then followed by router.refresh() so
// Server Components re-render against the new cookie.
export async function setLocaleAction(locale: AppLocale) {
  const cookieStore = await cookies()

  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('profiles').update({ locale }).eq('id', user.id)
  }
}
