import type { Metadata } from "next";
import { Suspense } from 'react';
import { queries } from "@/lib/graphql/queries/index";
import type { WordPressPost } from "@/types/wordpress";
import { config } from '@/config';
import { logger } from '@/lib/logger';
import { serverQuery } from '@/lib/apollo/query';
import { MainLayout } from '@/app/components/layouts/MainLayout';
import { PostContent } from '@/app/components/posts/PostContent';
import { ClientContent } from '@/app/components/ClientContent';
import { createClient } from '@/lib/supabase/server';
import { getMetaEntries, getLikedUrls } from '@/app/components/SitemapMetaPreview/Server';
import { ProfileSidebar } from '@/app/components/ProfileSidebar/ProfileSidebar';
import { prisma } from '@/lib/prisma';
import { normalizeUrl } from '@/lib/utils/normalizeUrl';
import { unstable_cache } from 'next/cache';
import { Loader2 } from 'lucide-react';

// Route segment config
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
  }>;
}

// Cached data fetching functions
const getCachedPostAndRelated = unstable_cache(
  async (slug: string, categorySlug: string) => {
    const { data } = await serverQuery<{
      post: WordPressPost;
      relatedPosts: { nodes: WordPressPost[] };
    }>({
      query: queries.posts.getPostAndRelated,
      variables: { 
        slug,
        categorySlug,
        first: 5 
      },
      options: {
        fetchPolicy: 'network-only',
        context: {
          fetchOptions: {
            cache: 'force-cache'
          }
        }
      }
    });
    return data;
  },
  ['post-and-related'],
  { revalidate: 3600 } // Cache for 1 hour
);

const getCachedMetaData = unstable_cache(
  async (post: WordPressPost, userId?: string) => {
    const [metaData, initialLikedUrls] = await Promise.all([
      getMetaEntries(post),
      userId ? getLikedUrls(userId) : Promise.resolve([]),
    ]);
    return { metaData, initialLikedUrls };
  },
  ['meta-data'],
  { revalidate: 300 } // Cache for 5 minutes
);

const getCachedCounts = unstable_cache(
  async () => {
    const [commentCounts, likeCounts] = await Promise.all([
      prisma.comment.groupBy({
        by: ['url'],
        _count: { id: true }
      }),
      prisma.metaLike.groupBy({
        by: ['meta_url'],
        _count: { id: true }
      })
    ]);
    return { commentCounts, likeCounts };
  },
  ['counts'],
  { revalidate: 60 } // Cache for 1 minute
);

// Generate static params for build time
export async function generateStaticParams() {
  const { data } = await serverQuery<{ posts: { nodes: WordPressPost[] } }>({
    query: queries.posts.getAll,
  });

  return (data?.posts?.nodes || []).map((post) => ({
    categorySlug: post.categories?.nodes?.[0]?.slug || 'uncategorized',
    postSlug: post.slug,
  }));
}

// Optimized metadata generation
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { post } = await getCachedPostAndRelated(
    resolvedParams.postSlug,
    resolvedParams.categorySlug
  );
  
  const images = post.featuredImage?.node?.sourceUrl 
    ? [{
        url: post.featuredImage.node.sourceUrl,
        width: 1200,
        height: 630,
        alt: post.title
      }]
    : [];

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images,
      type: 'article',
      authors: [post.author?.node?.name || config.site.name]
    },
    other: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  };
}

// Simple loading component
function LoadingState() {
  return (
    <div className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] w-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Main page component
export default async function PostPage({ params }: PageProps) {
  try {
    const resolvedParams = await params;
    
    // Parallel data fetching with Promise.all
    const [
      { post, relatedPosts },
      { data: { user } },
      counts
    ] = await Promise.all([
      getCachedPostAndRelated(resolvedParams.postSlug, resolvedParams.categorySlug),
      (await createClient()).auth.getUser(),
      getCachedCounts()
    ]);

    if (!post) throw new Error('Post not found');

    // Fetch meta data in parallel
    const metaData = await getCachedMetaData(post, user?.id);

    // Process entries with counts
    const { entries, hasMore } = metaData.metaData;
    const { commentCounts, likeCounts } = counts;

    // Convert counts to maps
    const commentCountMap = new Map(
      commentCounts.map(count => [normalizeUrl(count.url), count._count.id])
    );
    const likeCountMap = new Map(
      likeCounts.map(count => [normalizeUrl(count.meta_url), count._count.id])
    );

    // Add counts to entries
    const entriesWithCounts = entries.map(entry => ({
      ...entry,
      commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
      likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0
    }));

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.excerpt,
      image: [post.seo?.opengraphImage?.sourceUrl || post.featuredImage?.node?.sourceUrl].filter(Boolean),
      datePublished: new Date(post.date).toISOString(),
      dateModified: post.modified ? new Date(post.modified).toISOString() : new Date(post.date).toISOString(),
      author: {
        "@type": "Person",
        name: post.author?.node?.name || config.site.name
      }
    };

    return (
      <div className="container-fluid">
        <MainLayout
          rightSidebar={
            <ProfileSidebar
              user={user}
              post={post}
              relatedPosts={relatedPosts.nodes}
            />
          }
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          
          <Suspense fallback={<LoadingState />}>
            <PostContent>
              <ClientContent 
                post={post}
                metaEntries={entriesWithCounts}
                initialLikedUrls={metaData.initialLikedUrls}
                initialHasMore={hasMore}
                userId={user?.id}
              />
            </PostContent>
          </Suspense>
        </MainLayout>
      </div>
    );
  } catch (error) {
    logger.error('Error in PostPage:', error);
    return (
      <div className="container-fluid">
        <MainLayout>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Error loading post</h2>
            <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
          </div>
        </MainLayout>
      </div>
    );
  }
}
