import type { Metadata, ResolvingMetadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { queries } from "@/lib/graphql/queries/index";
import type { WordPressPost, CategoryData } from "@/types/wordpress";
import { config } from '@/config';
import { PostLoading, PostError } from '@/app/components/loading/PostLoading';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { serverQuery } from '@/lib/apollo/query';
import { MainLayout } from '@/app/components/layouts/MainLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getSitemapPage } from '@/lib/sitemap/sitemap-service';
import React from 'react';
import { ProfileSidebarWrapper } from '@/app/components/ProfileSidebar/ProfileSidebarWrapper';
import { PostContent } from '@/app/components/posts/PostContent';
import { Redis } from '@upstash/redis';
import type { SitemapEntry } from '@/lib/sitemap/types';
import { SitemapMetaPreviewServer } from '@/app/components/SitemapMetaPreview/Server';

// Route segment config
export const revalidate = 3600;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-cache';

interface PageProps {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
  }>;
}

// Cache the post data fetching
const getPostData = unstable_cache(
  async (slug: string) => {
    const { data } = await serverQuery<{ post: WordPressPost }>({
      query: queries.posts.getBySlug,
      variables: { slug },
      options: {
        tags: [`post:${slug}`]
      }
    });
    return data.post;
  },
  ['post-data'],
  {
    revalidate: 3600,
    tags: ['posts']
  }
);

// Generate static params for build time (same pattern as category)
export async function generateStaticParams() {
  const { data } = await serverQuery<{ posts: { nodes: WordPressPost[] } }>({
    query: queries.posts.getAll,
    options: {
      static: true // Mark as static for build time
    }
  });

  return (data?.posts?.nodes || []).map((post) => ({
    categorySlug: post.categories?.nodes?.[0]?.slug || 'uncategorized',
    postSlug: post.slug,
  }));
}

// Metadata generation
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Await params before using
  const resolvedParams = await params;
  const post = await getPostData(resolvedParams.postSlug);
  
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

// Keep only the SitemapMetaPreview dynamic import
// const SitemapMetaPreview = dynamic(
//   () => import('@/app/components/SitemapMetaPreview').then(mod => mod.SitemapMetaPreview),
//   { 
//     loading: () => <div className="h-96 w-full animate-pulse bg-muted" />
//   }
// );

// Update the getMetaEntries function
const getMetaEntries = unstable_cache(
  async (post: WordPressPost): Promise<SitemapEntry[]> => {
    if (!post.sitemapUrl?.sitemapurl) return [];
    
    try {
      const result = await getSitemapPage(post.sitemapUrl.sitemapurl, 1);
      return result.entries || [];
    } catch (error) {
      logger.error('Meta entries fetch error:', error);
      return [];
    }
  },
  ['meta-entries'],
  { revalidate: 86400 }
);

// Update the getSitemapData function to handle the new return type
const getSitemapData = unstable_cache(
  async (url: string) => {
    try {
      const redis = Redis.fromEnv();
      const cacheKey = `sitemap:${url}`;
      
      const cachedData = await redis.get<SitemapEntry[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const result = await getSitemapPage(url, 1);
      if (!result || !result.entries) {
        throw new Error('Failed to fetch sitemap entries');
      }
      
      return result.entries;
    } catch (error) {
      logger.error('Sitemap fetch error:', error);
      return [];
    }
  },
  ['sitemap-data'],
  {
    revalidate: 86400,
    tags: ['sitemaps']
  }
);

// Page component
export default async function PostPage({ params }: PageProps) {
  try {
    // Await params before using
    const resolvedParams = await params;
    
    // Get user data
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch post data once and reuse
    const post = await getPostData(resolvedParams.postSlug);
    
    if (!post) {
      throw new Error('Post not found');
    }

    // Get meta entries in parallel with other data
    const [metaEntries, relatedPosts] = await Promise.all([
      getMetaEntries(post),
      (async () => {
        const postCategorySlug = post.categories?.nodes?.[0]?.slug;
        if (!postCategorySlug) return [];

        const { data } = await serverQuery<CategoryData>({
          query: queries.categories.getWithPosts,
          variables: { 
            slug: postCategorySlug,
            first: 5
          }
        });
        
        return data?.category?.posts?.nodes
          .filter((p: WordPressPost) => p.id !== post.id)
          .slice(0, 5) || [];
      })()
    ]);

    // Access the nested sitemapurl field, fallback to constructed URL
    const sitemapUrl = post.sitemapUrl?.sitemapurl || 
      `/${resolvedParams.categorySlug}/${resolvedParams.postSlug}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.excerpt?.replace(/(<([^>]+)>|&[^;]+;)/gi, "").trim() || "",
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
            <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
              <ProfileSidebarWrapper 
                user={user}
                post={post} 
                relatedPosts={relatedPosts}
              />
            </Suspense>
          }
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          
          <PostContent post={post}>
            <SitemapMetaPreviewServer post={post} />
          </PostContent>
        </MainLayout>
      </div>
    );
  } catch (error) {
    logger.error('Error in PostPage:', error);
    return <PostError />;
  }
}
