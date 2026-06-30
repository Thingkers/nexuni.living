import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/post-room', '/inbox', '/profile']
const ADMIN_ROUTES    = ['/admin']
const AUTH_ROUTES     = ['/auth/login', '/auth/register']

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } })

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

  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  const isAdmin     = ADMIN_ROUTES.some((r) => pathname.startsWith(r))
  const isAuthPage  = AUTH_ROUTES.some((r) => pathname.startsWith(r))

  // No session → redirect to login (preserve intended destination)
  if ((isProtected || isAdmin) && !session) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes → verify role in DB
  if (isAdmin && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Already logged in → skip login/register pages
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/post-room/:path*',
    '/inbox/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/auth/login',
    '/auth/register',
  ],
}