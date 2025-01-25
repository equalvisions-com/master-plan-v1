import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { queries } from "@/lib/graphql/queries/index";
import type { WordPressPost } from "@/types/wordpress";
import { config } from '@/config';
import { PostLoading, PostError } from '@/app/components/loading/PostLoading';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { serverQuery } from '@/lib/apollo/query';
import { BookmarkButton } from '@/app/components/BookmarkButton';
import { BookmarkLoading } from '@/app/components/BookmarkButton/loading';
import { MainLayout } from '@/app/components/layouts/MainLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfileSidebar } from '@/app/components/ProfileSidebar';

// Route segment config
export const revalidate = 3600;
export const fetchCache = 'force-cache';
export const dynamicParams = true;

interface PageProps {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
  }>;
}

// Cache the post data fetching with static hint (same pattern)
const getPostData = unstable_cache(
  async (postSlug: string) => {
    const { data } = await serverQuery<{ post: WordPressPost }>({
      query: queries.posts.getBySlug,
      variables: { slug: postSlug },
      options: {
        tags: [`post:${postSlug}`, 'posts'],
        monitor: true,
        static: true // Add static hint for build time
      }
    });
    
    return data?.post || null;
  },
  ['post-data'],
  {
    revalidate: config.cache.ttl,
    tags: ['posts', 'content']
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

// Enhanced metadata generation (same pattern)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postSlug } = await params;
  const post = await getPostData(postSlug);

  if (!post) {
    return {
      title: 'Post Not Found',
      robots: 'noindex',
    };
  }

  return {
    title: `${post.title} | Your Site`,
    alternates: {
      canonical: post.sitemapUrl?.sitemapurl || undefined
    }
  };
}

// Page component
export default async function PostPage({ params }: PageProps) {
  const { categorySlug, postSlug } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error && error.status !== 400) {
    logger.error("Auth error:", error);
  }

  const post = await getPostData(postSlug);
  
  if (!post) {
    return <PostError />;
  }

  // Add detailed logging
  console.log('Post Data:', {
    id: post.id,
    title: post.title,
    slug: post.slug,
    sitemapUrl: post.sitemapUrl
  });

  // Access the nested sitemapurl field, fallback to constructed URL if not available
  const sitemapUrl = post.sitemapUrl?.sitemapurl || `/${categorySlug}/${postSlug}`;
  
  console.log('Debug sitemapUrl:', {
    acfField: post.sitemapUrl,
    finalUrl: sitemapUrl,
    rawPost: post
  });

  // Keep JSON-LD for SEO
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
        rightSidebar={<ProfileSidebar user={user} post={post} />}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        <ScrollArea className="h-[calc(100svh-var(--page-offset))]" type="always">
          <ErrorBoundary fallback={<PostError />}>
            <Suspense fallback={<PostLoading />}>
              <article className="max-w-4xl">
                <div className="space-y-8">
                  <h1 className="text-3xl font-bold">{post.title}</h1>
                  
                  {post.featuredImage?.node && (
                    <div className="relative aspect-video">
                      <Image
                        src={post.featuredImage.node.sourceUrl}
                        alt={post.featuredImage.node.altText || post.title}
                        fill
                        className="object-cover rounded-lg"
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                      />
                    </div>
                  )}

                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                </div>
              </article>
            </Suspense>
          </ErrorBoundary>
        </ScrollArea>
      </MainLayout>
    </div>
  );
}
