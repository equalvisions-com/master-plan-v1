// --------------------------------------
// app/page.tsx (Typical home route)
// --------------------------------------
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { config } from '@/config';
import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { queries } from "@/lib/graphql/queries/index";
import type { PageInfo, PostsData, WordPressPost } from "@/types/wordpress";
import { serverQuery } from '@/lib/apollo/query';
import { PostError } from '@/app/components/posts/PostError';
import { MainLayout } from "@/app/components/layouts/MainLayout";
import { Feed } from '@/app/components/Feed/Feed';

// Keep these
export const revalidate = 60;
export const fetchCache = 'force-cache';
export const dynamicParams = true;

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
    alternates: {
      canonical: config.site.url
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
          first: 6,
          after: ((1 - 1) * 6).toString()
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

export default async function HomePage() {
  await (await createClient()).auth.getUser();

  return (
    <div className="container-fluid">
      <MainLayout>
        <ErrorBoundary fallback={<PostError />}>
          <Feed />
        </ErrorBoundary>
      </MainLayout>
    </div>
  );
}
