import { Suspense } from 'react';
import { PostListSkeleton } from '@/app/components/loading/PostListSkeleton';
import { PostList } from '@/app/components/posts';
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { config } from '@/config';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { RevalidateContent } from '@/app/components/RevalidateContent';
import { cacheHandler } from '@/lib/cache/vercel-cache-handler';
import { MainNav } from '@/components/nav';
import { warmHomePagePosts } from '@/lib/cache/cache-utils';

// Route segment config for Next.js 15
export const dynamic = 'force-static';
export const revalidate = 3600;

// Cache Configuration
export const fetchCache = 'force-cache';
export const dynamicParams = false;

// Add interface for home page data
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

// Cache Tags for Granular Revalidation
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  
  // Warm the cache for first page posts (in both dev and prod)
  await warmHomePagePosts();
  
  return {
    title: 'Latest Posts',
    other: {
      'Cache-Control': `public, s-maxage=${config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vary': 'Accept-Encoding, x-next-cache-tags'
    },
  };
}

// Update the cache function with proper typing and tracking
const getHomeData = unstable_cache(
  async (): Promise<HomeResponse | null> => {
    const cacheKey = 'homepage';
    try {
      // Track successful cache operation
      cacheHandler.trackCacheOperation(cacheKey, true);

      return {
        data: {
          title: 'Latest Posts',
          description: 'Stay updated with our latest content',
          lastModified: new Date().toISOString()
        },
        tags: [
          cacheKey,
          'posts',
          'categories',
          'content',
          ...config.cache.tags.global
        ],
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      cacheHandler.trackCacheOperation(cacheKey, false);
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
  try {
    const homeResponse = await getHomeData();
    if (!homeResponse) {
      throw new Error('Failed to load homepage data');
    }

    const lastModified = homeResponse.data.lastModified;
    const isStale = process.env.ENABLE_STALE_CHECK === 'true' && (
      new Date(lastModified).getTime() < Date.now() - (config.cache.ttl * 1000) ||
      new Date(lastModified).getTime() < Date.now() - (config.cache.staleWhileRevalidate * 1000)
    );

    // Development logging
    if (process.env.NODE_ENV !== 'production') {
      console.log({
        lastModified: new Date(lastModified).toISOString(),
        now: new Date().toISOString(),
        ttl: config.cache.ttl,
        staleWhileRevalidate: config.cache.staleWhileRevalidate,
        isStaleCheckEnabled: process.env.ENABLE_STALE_CHECK === 'true',
        isStale,
        timeSinceLastModified: Math.floor((Date.now() - new Date(lastModified).getTime()) / 1000 / 60),
      });
    }

    return (
      <div className="min-h-screen">
        {/* Silent revalidation for stale content */}
        {isStale && (
          <RevalidateContent 
            tags={[
              'homepage',
              'posts',
              'categories',
              'content',
              ...config.cache.tags.global
            ]} 
          />
        )}

        <header className="border-b">
          <div className="container mx-auto px-4">
            <MainNav />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold">{homeResponse.data.title}</h1>
            <p className="text-muted-foreground mt-2">
              {homeResponse.data.description}
            </p>
          </div>

          <ErrorBoundary>
            <Suspense fallback={<PostListSkeleton />}>
              <PostList 
                key={`posts-${config.cache.ttl}`}
                cacheTags={[
                  'posts',
                  'homepage',
                  'content',
                  ...config.cache.tags.global
                ]}
              />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    );
  } catch (error) {
    console.error('Error in Home page:', error);
    throw error;
  }
}

