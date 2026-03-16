import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')
  const isModulePage = ['/bookings', '/tailoring', '/expenses', '/inventory'].some(path => request.nextUrl.pathname.startsWith(path))
  const isWelcomePage = request.nextUrl.pathname.startsWith('/welcome')
  const isProtectedPage = isDashboardPage || isWelcomePage || isModulePage

  console.log(`[Middleware] Path: ${request.nextUrl.pathname}, User: ${user?.id || 'None'}`)

  // If user is not logged in and trying to access protected page
  if (!user && isProtectedPage) {
    console.log(`[Middleware] Unauthorized access to ${request.nextUrl.pathname}, redirecting to /login`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in
  if (user) {
    // Fetch profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error(`[Middleware] Profile error for ${user.id}:`, profileError.message)
    }

    const isAdmin = profile?.role === 'admin'
    console.log(`[Middleware] User: ${user.id}, Role: ${profile?.role || 'None'}, isAdmin: ${isAdmin}`)

    // If logged in but not admin trying to access protected page
    if (!isAdmin && isProtectedPage) {
       console.log(`[Middleware] Non-admin access to ${request.nextUrl.pathname}, signing out and redirecting`)
       await supabase.auth.signOut()
       return NextResponse.redirect(new URL('/login?error=Unauthorized', request.url))
    }

    // If logged in and trying to access login page
    if (isAdmin && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}
