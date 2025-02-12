// --------------------------------------
// app/page.tsx (Typical home route)
// --------------------------------------
import type { Metadata } from 'next';
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { config } from '@/config';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { queries } from "@/lib/graphql/queries/index";
import type { PageInfo, PostsData, WordPressPost } from "@/types/wordpress";
import { serverQuery } from '@/lib/apollo/query';
import { PostError } from '@/app/components/posts/PostError';
import { MainLayout } from "@/app/components/layouts/MainLayout";
import { default as Feed } from '@/app/components/Feed/Client';
import { getFeedEntries } from '@/app/components/Feed/Server';
import { getLikedUrls } from '@/app/components/SitemapMetaPreview/Server';

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
  const baseUrl = config.site.url;
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
      canonical: baseUrl
    }
  };
}

const getHomeData = unstable_cache(
  async (): Promise<HomeResponse | null> => {
    try {
      const { data } = await serverQuery<PostsData>({
        query: queries.posts.getLatest,
        variables: { 
          first: 6,
          after: "0"
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
  const { data: { user } } = await (await createClient()).auth.getUser();
  
  let feedContent = null;
  
  if (user) {
    const [{ entries, nextCursor, total }, initialLikedUrls] = await Promise.all([
      getFeedEntries(user.id),
      getLikedUrls(user.id)
    ]);

    feedContent = (
      <Feed
        userId={user.id}
        initialEntries={entries}
        initialLikedUrls={initialLikedUrls}
        initialTotal={total}
        initialNextCursor={nextCursor}
      />
    );
  }

  return (
    <div className="container-fluid">
      <MainLayout>
        <ErrorBoundary fallback={<PostError />}>
          {feedContent}
        </ErrorBoundary>
      </MainLayout>
    </div>
  );
}
