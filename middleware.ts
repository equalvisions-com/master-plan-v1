import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { config as appConfig } from '@/config';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Improved cache control for ISR
  response.headers.set('Cache-Control', 
    `public, s-maxage=${appConfig.cache.ttl}, stale-while-revalidate=${appConfig.cache.staleWhileRevalidate}`
  );
  
  // Add Surrogate-Control for better CDN caching
  response.headers.set('Surrogate-Control', 
    `max-age=${appConfig.cache.ttl}, stale-while-revalidate=${appConfig.cache.staleWhileRevalidate}`
  );
  
  // Add Vary header for proper cache invalidation
  response.headers.set('Vary', 'Accept-Encoding, x-next-cache-tags');
  
  return response;
}

// Rename to middlewareConfig to avoid conflict
export const middlewareConfig = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 