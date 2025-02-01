import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Monitoring } from '@/lib/monitoring'

export async function middleware(request: NextRequest) {
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
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getSession()

  // Track cache status from Vercel's edge
  const cacheStatus = response.headers.get('x-vercel-cache')
  if (cacheStatus) {
    const startTime = performance.now();
    Monitoring.trackCacheEvent({
      type: cacheStatus === 'HIT' ? 'hit' : 'miss',
      key: request.url,
      source: 'vercel',
      duration: performance.now() - startTime
    });
  }

  // Add like event tracking
  Monitoring.trackEvent({
    type: 'meta_like',
    user: user?.id,
    meta_url: metaUrl
  });

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 