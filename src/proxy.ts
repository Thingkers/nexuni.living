import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/post-room', '/post-book', '/post-job', '/inbox', '/profile']
const ADMIN_ROUTES    = ['/admin']
const AUTH_ROUTES     = ['/auth/login', '/auth/register']

// Narrow admin routes a module-scoped admin (public.module_admins) may
// enter even without profiles.role === 'admin'. Every other /admin/* path
// stays global-admin-only.
const MODULE_ADMIN_ROUTE_PREFIXES: Record<string, string> = {
  '/admin/books': 'books',
  '/admin/services': 'services',
  '/admin/jobs': 'jobs',
  '/admin/transport': 'transport',
}

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } })
  const { pathname } = req.nextUrl

  // UI-only local mode has no auth backend. Public/auth pages still render,
  // while data-dependent protected pages return to the homepage.
  if (process.env.NEXT_PUBLIC_APP_MODE === 'no-data') {
    const requiresData = [...PROTECTED_ROUTES, ...ADMIN_ROUTES]
      .some((route) => pathname.startsWith(route))
    return requiresData
      ? NextResponse.redirect(new URL('/', req.url))
      : res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: { headers: req.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() re-validates the token against the Supabase Auth server on
  // every call, unlike getSession() which just reads the (unverified)
  // cookie. Middleware gates admin access, so it must not trust a session
  // that Supabase itself hasn't confirmed is still valid.
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  const isAdmin     = ADMIN_ROUTES.some((r) => pathname.startsWith(r))
  const isAuthPage  = AUTH_ROUTES.some((r) => pathname.startsWith(r))

  // No session → redirect to login (preserve intended destination)
  if ((isProtected || isAdmin) && !user) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes → verify role in DB
  if (isAdmin && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      // Not a global admin — a module-scoped admin may still enter their
      // own narrow /admin/<module> slice.
      const moduleEntry = Object.entries(MODULE_ADMIN_ROUTE_PREFIXES)
        .find(([prefix]) => pathname.startsWith(prefix))

      if (moduleEntry) {
        const [, moduleKey] = moduleEntry
        const { data: assignment } = await supabase
          .from('module_admins')
          .select('module')
          .eq('user_id', user.id)
          .eq('module', moduleKey)
          .maybeSingle()

        if (!assignment) {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      } else {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  // Already logged in → skip login/register pages
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/post-room/:path*',
    '/post-book/:path*',
    '/post-job/:path*',
    '/inbox/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/auth/login',
    '/auth/register',
  ],
}