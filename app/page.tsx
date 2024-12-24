import { Suspense } from 'react';
import { PostListSkeleton } from '@/app/components/loading/PostListSkeleton';
import { PostList } from '@/app/components/posts';
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { config } from '@/config';
import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { RevalidateContent } from '@/app/components/RevalidateContent';
import { MainNav } from '@/app/components/nav';
import { createClient } from '@/lib/supabase/server';

// Route segment config for Next.js 15
export const dynamic = 'force-dynamic';

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
  return {
    other: {
      'Cache-Control': `public, s-maxage=${config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
    },
  };
}

// Update the cache function with proper typing and tracking
const getHomeData = unstable_cache(
  async (): Promise<HomeResponse | null> => {
    const cacheKey = 'homepage';
    
    try {
      // Since we're not actually using cache tracking, we can remove these lines
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
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

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
}

