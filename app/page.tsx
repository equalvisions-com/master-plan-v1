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
import { logger } from '@/lib/logger';
import { queries } from "@/lib/graphql/queries/index";
import type { PageInfo, PostsData, WordPressPost } from "@/types/wordpress";
import { serverQuery } from '@/lib/apollo/query';
import { PostError } from '@/app/components/posts/PostError';

// Keep these
export const revalidate = 3600;
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

interface PostOrderbyInput {
  field: 'DATE' | 'MODIFIED' | 'TITLE';
  order: 'ASC' | 'DESC';
}

interface PostWhereArgs {
  status?: 'PUBLISH' | 'DRAFT' | 'PRIVATE';
  orderby?: PostOrderbyInput[];
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
    try {
      const { data } = await serverQuery<{ posts: PostsData['posts'] }>({
        query: queries.posts.getLatest,
        variables: { 
          first: 6,
          where: {
            status: "PUBLISH" as const,
            orderby: [{ 
              field: "DATE" as const, 
              order: "DESC" as const 
            }]
          } satisfies PostWhereArgs
        },
        options: {
          tags: ['homepage', 'posts'],
          monitor: true,
          static: true
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

interface HomePageProps {
  searchParams: Promise<{
    page?: string;
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Await the searchParams
  const resolvedParams = await searchParams;
  const page = Number(resolvedParams?.page) || 1;
  const perPage = 6;

  // Add user fetch
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error && error.status !== 400) {
    logger.error("Auth error:", error);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4">
          <MainNav user={user} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ErrorBoundary fallback={<PostError />}>
          <Suspense fallback={<PostListSkeleton />}>
            <PostList 
              perPage={perPage}
              page={page}
            />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
