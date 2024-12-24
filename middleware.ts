import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Monitoring } from '@/lib/monitoring'
import { getEdgeConfig } from '@/lib/edge-config'
import type { CacheConfig, FeatureFlags } from '@vercel/edge-config'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add Edge Config if enabled
  if (process.env.VERCEL_EDGE_CONFIG === 'true') {
    try {
      const cacheConfig = await getEdgeConfig('cache-config')
      if (cacheConfig) {
        response.headers.set('x-edge-cache-config', JSON.stringify(cacheConfig))
      }

      const featureFlags = await getEdgeConfig('feature-flags')
      if (featureFlags) {
        response.headers.set('x-edge-features', JSON.stringify(featureFlags))
      }
    } catch (error) {
      console.error('Error applying edge config:', error)
    }
  }

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

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 