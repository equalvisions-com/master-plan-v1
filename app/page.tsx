// --------------------------------------
// app/page.tsx (Typical home route)
// --------------------------------------
import { Suspense } from 'react';
import { PostListSkeleton } from '@/app/components/loading/PostListSkeleton';
import { PostList } from '@/app/components/posts';
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { config } from '@/config';
import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { MainNav } from '@/app/components/nav';
import { createClient } from '@/lib/supabase/server';
import { cacheMonitor } from '@/lib/cache/monitoring';
import { logger } from '@/lib/logger';

// Use static values for route segment config
export const dynamic = 'auto';
export const revalidate = 3600; // 1 hour
export const fetchCache = 'force-cache';
export const dynamicParams = true;

interface HomePageData {
  title: string;
  description: string;
  lastModified: string;
}

interface HomeResponse {
  data: HomePageData;
  tags: string[];
  lastModified: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const homeData = await getHomeData();

  return {
    title: homeData?.data.title || config.site.name,
    description: homeData?.data.description || config.site.description,
    other: {
      'Cache-Control': `public, s-maxage=${config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
    },
  };
}

// Unified approach for getHomeData with unstable_cache
const getHomeData = unstable_cache(
  async (): Promise<HomeResponse | null> => {
    const cacheKey = 'homepage';
    const startTime = performance.now();
    
    try {
      // Mocked data example (could be from an API or DB)
      const data = {
        title: 'Latest Posts',
        description: 'Stay updated with our latest content',
        lastModified: new Date().toISOString(),
      };

      const tags = [
        cacheKey,
        'posts',
        'categories',
        'content',
        ...config.cache.tags.global
      ];

      const response = {
        data,
        tags,
        lastModified: new Date().toISOString()
      };

      cacheMonitor.logCacheHit(cacheKey, 'next', performance.now() - startTime);
      return response;
    } catch (error) {
      cacheMonitor.logCacheMiss(cacheKey, 'next', performance.now() - startTime);
      console.error('Error fetching home data:', error);
      return null;
    }
  },
  ["homepage-data"],
  {
    revalidate: config.cache.ttl,
    tags: [
      'homepage',
      'posts',
      'categories',
      'content',
      ...config.cache.tags.global
    ]
  }
);

export default async function Home() {
  const startTime = performance.now();
  
  try {
    const [homeData, supabase] = await Promise.all([
      getHomeData(),
      createClient()
    ]);

    if (!homeData) {
      throw new Error('Failed to fetch home data');
    }

    // First get the session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Then get the user if there's a session
    let user = null;
    if (session) {
      const { data: { user: sessionUser }, error } = await supabase.auth.getUser();
      if (error) {
        logger.error("Auth error:", error);
      } else {
        user = sessionUser;
      }
    }

    cacheMonitor.logCacheHit('homepage', 'isr', performance.now() - startTime);

    return (
      <div className="min-h-screen">
        <header className="border-b">
          <div className="container mx-auto px-4">
            <MainNav user={user} />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <ErrorBoundary>
            <Suspense fallback={<PostListSkeleton />}>
              <PostList perPage={6} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    );
  } catch (error) {
    cacheMonitor.logCacheMiss('homepage', 'isr', performance.now() - startTime);
    throw error;
  }
}
