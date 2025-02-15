// --------------------------------------
// app/page.tsx (Typical home route)
// --------------------------------------
import { config } from '@/config';
import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { logger } from '@/lib/logger';
import { queries } from "@/lib/graphql/queries/index";
import type { PageInfo, PostsData, WordPressPost } from "@/types/wordpress";
import { serverQuery } from '@/lib/apollo/query';
import { MainLayout } from "@/app/components/layouts/MainLayout";
import { Suspense } from 'react'
import { FeedServer } from '@/app/components/feed/FeedServer'
import { Loader2 } from 'lucide-react'

// Keep these
export const revalidate = 60;
export const fetchCache = 'force-cache';
export const dynamicParams = true;
export const dynamic = 'force-dynamic';

interface HomePageData {
  title: string;
  description: string;
  lastModified: string;
  posts: {
    nodes: WordPressPost[];
    pageInfo: PageInfo;
  };
}

interface HomeResponse {
  data: HomePageData;
  tags: string[];
  lastModified: string;
}

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const page = typeof resolvedParams?.page === 'string' ? Number(resolvedParams.page) : 1;
  const baseUrl = config.site.url;

  // Get home data for title and description
  const homeData = await getHomeData();
  
  return {
    title: homeData?.data.title || config.site.name,
    description: homeData?.data.description || config.site.description,
    other: {
      'Cache-Control': `public, s-maxage=${config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
    },
    alternates: {
      canonical: `${baseUrl}${page > 1 ? `?page=${page}` : ''}`
    }
  };
}

// Unified approach for getHomeData with unstable_cache
const getHomeData = unstable_cache(
  async (): Promise<HomeResponse | null> => {
    try {
      const { data } = await serverQuery<PostsData>({
        query: queries.posts.getLatest,
        variables: { 
          first: 24,
          after: ((1 - 1) * 24).toString()
        },
        options: {
          tags: ['posts'],
          context: {
            fetchOptions: {
              next: { revalidate: 3600 }
            }
          }
        }
      });

      if (!data?.posts) {
        return null;
      }

      return {
        data: {
          title: 'Latest Posts',
          description: 'Stay updated with our latest content',
          lastModified: new Date().toISOString(),
          posts: data.posts
        },
        tags: ['homepage', 'posts', 'categories', 'content'],
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error fetching home data:', error);
      return null;
    }
  },
  ["homepage-data"],
  {
    revalidate: config.cache.ttl,
    tags: ['homepage', 'posts', 'categories', 'content']
  }
);

function LoadingState() {
  return (
    <div className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] w-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MainLayout>
        <Suspense fallback={<LoadingState />}>
          <FeedServer />
        </Suspense>
      </MainLayout>
    </Suspense>
  )
}
