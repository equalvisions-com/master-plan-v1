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
import { MainNav } from '@/app/components/nav';
import { createClient } from '@/lib/supabase/server';
import { serverQuery } from '@/lib/apollo/query';

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
export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const { postSlug } = await params;
  const post = await getPostData(postSlug);

  if (!post) {
    return {
      title: 'Post Not Found',
      robots: 'noindex',
      other: {
        'Cache-Control': 'no-store, must-revalidate',
      }
    };
  }

  return {
    title: post.seo?.title || post.title || config.site.name,
    description: post.seo?.metaDesc || post.excerpt?.replace(/(<([^>]+)>|&[^;]+;)/gi, "").trim() || '',
    robots: {
      index: !post.seo?.metaRobotsNoindex,
      follow: !post.seo?.metaRobotsNofollow,
    },
    openGraph: {
      title: post.seo?.opengraphTitle || post.title,
      description: post.seo?.opengraphDescription || post.excerpt,
      images: post.seo?.opengraphImage?.sourceUrl ? [
        {
          url: post.seo.opengraphImage.sourceUrl,
          width: post.seo.opengraphImage.mediaDetails?.width,
          height: post.seo.opengraphImage.mediaDetails?.height,
          alt: post.seo.opengraphImage.altText || post.title,
        }
      ] : post.featuredImage?.node ? [
        {
          url: post.featuredImage.node.sourceUrl,
          width: post.featuredImage.node.mediaDetails?.width,
          height: post.featuredImage.node.mediaDetails?.height,
          alt: post.featuredImage.node.altText || post.title,
        }
      ] : [],
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.modified || post.date,
      authors: post.author?.node?.name ? [post.author.node.name] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo?.twitterTitle || post.title,
      description: post.seo?.twitterDescription || post.excerpt,
      images: post.seo?.twitterImage?.sourceUrl ? [post.seo.twitterImage.sourceUrl] : undefined,
    },
    other: {
      'Cache-Control': `public, s-maxage=${config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
    }
  };
}

// Page component
export default async function PostPage({ params }: PageProps) {
  const { postSlug } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error && error.status !== 400) {
    logger.error("Auth error:", error);
  }

  const post = await getPostData(postSlug);
  
  if (!post) {
    return <PostError />;
  }

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="min-h-screen">
        <header className="border-b">
          <div className="container mx-auto px-4">
            <MainNav user={user} />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <ErrorBoundary fallback={<PostError />}>
            <Suspense fallback={<PostLoading />}>
              <article className="max-w-4xl mx-auto">
                {post.featuredImage?.node && (
                  <div className="mb-8 relative aspect-video">
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
                <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </article>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}
