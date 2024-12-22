import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { unstable_cache } from "next/cache";
import { getClient } from "@/lib/apollo/apollo-client";
import { queries } from "@/lib/graphql/queries/index";
import type { WordPressPost, WordPressCategory } from "@/types/wordpress";
import { config } from '@/config';
import type { OpenGraph } from 'next/dist/lib/metadata/types/opengraph-types';
import { revalidateTag } from 'next/cache';
import { cacheHandler } from '@/lib/cache/vercel-cache-handler';
import { revalidateTags } from '@/lib/actions';
import { RevalidateContent } from '@/app/components/RevalidateContent';
import { warmHomePagePosts, warmRelatedPosts } from '@/lib/cache/cache-utils';
import { PostLoading, PostError } from '@/app/components/loading/PostLoading';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { Suspense } from 'react';
import { logger } from '@/lib/logger';
import { loadPost } from '@/lib/apollo/edge-loader';

// Route segment config for Next.js 15
export const runtime = "edge";
export const preferredRegion = "auto";
export const dynamic = "error";
export const fetchCache = "force-cache";
export const revalidate = config.cache.ttl;

interface PageProps {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
  }>;
}

// Helper function to get the modified date
const getLastModified = (post: WordPressPost): string => {
  return post.modified || post.date;
};

// Cache post data with proper error handling and analytics
const getPostData = unstable_cache(
  async (slug: string) => {
    const cacheKey = `post:${slug}`;
    try {
      const client = await getClient();
      const result = await client.query<{ post: WordPressPost }>({
        query: queries.posts.getBySlug,
        variables: { slug },
        context: {
          fetchOptions: {
            cache: "force-cache",
            next: { 
              revalidate: config.cache.ttl,
              tags: [
                cacheKey,
                'posts',
                'content',
                ...config.cache.tags.global
              ]
            }
          }
        }
      });

      if (!result.data?.post) {
        return null;
      }

      return {
        data: result.data.post,
        tags: [
          cacheKey,
          'posts',
          ...result.data.post.categories.nodes.map(cat => `category:${cat.slug}`),
          ...config.cache.tags.global
        ],
        lastModified: getLastModified(result.data.post)
      };
    } catch (error) {
      console.error("Error fetching post:", error);
      return null;
    }
  },
  ["post-data"],
  {
    revalidate: config.cache.ttl,
    tags: ["posts"]
  }
);

// Add generateViewport export
export function generateViewport(): Viewport {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: '#000000' }
    ]
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug, postSlug } = await params;
  
  const post = await loadPost(postSlug);
  if (!post) return {};

  const baseUrl = config.site.url;
  const postUrl = `${baseUrl}/${categorySlug}/${postSlug}`;

  // Clean up HTML entities and tags in description
  const cleanDescription = post.excerpt?.replace(/(<([^>]+)>|&[^;]+;)/ig, '').trim() || '';

  // Format date strings
  const publishDate = new Date(post.date).toISOString();
  const modifiedDate = post.modified ? new Date(post.modified).toISOString() : publishDate;

  // Handle images more comprehensively
  const images = [];
  
  if (post.seo?.opengraphImage?.sourceUrl) {
    images.push({
      url: post.seo.opengraphImage.sourceUrl,
      width: post.seo.opengraphImage.mediaDetails?.width || 1200,
      height: post.seo.opengraphImage.mediaDetails?.height || 630,
      alt: post.seo.opengraphImage.altText || post.title,
      type: 'image/jpeg',
    });
  }

  // Fallback to featured image if no OG image
  if (images.length === 0 && post.featuredImage?.node) {
    images.push({
      url: post.featuredImage.node.sourceUrl,
      width: post.featuredImage.node.mediaDetails?.width || 1200,
      height: post.featuredImage.node.mediaDetails?.height || 630,
      alt: post.featuredImage.node.altText || post.title,
      type: 'image/jpeg',
    });
  }

  return {
    title: {
      template: `%s | ${config.site.name}`,
      default: post.seo?.title || post.title,
    },
    description: cleanDescription,
    
    // Basic metadata
    applicationName: config.site.name,
    authors: post.author ? [{ name: post.author.node.name, url: post.author.node.url }] : undefined,
    generator: 'Next.js',
    keywords: post.seo?.metaKeywords?.split(',').map(k => k.trim()),
    referrer: 'origin-when-cross-origin',
    
    // Open Graph
    openGraph: {
      title: post.seo?.opengraphTitle || post.title,
      description: cleanDescription,
      url: post.seo?.canonical || postUrl,
      siteName: post.seo?.opengraphSiteName || config.site.name,
      images: images.length > 0 ? images : undefined,
      locale: 'en_US',
      type: 'article',
      publishedTime: publishDate,
      modifiedTime: modifiedDate,
      authors: post.author?.node.name,
      section: categorySlug,
      tags: post.tags?.nodes?.map(tag => tag.name),
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: post.seo?.twitterTitle || post.seo?.opengraphTitle || post.title,
      description: post.seo?.twitterDescription || cleanDescription,
      creator: post.author?.node?.social?.twitter,
      site: '@HamptonCurrent',
      images: images,
    },

    // Robots
    robots: {
      index: post.seo?.metaRobotsNoindex !== 'noindex',
      follow: post.seo?.metaRobotsNofollow !== 'nofollow',
      googleBot: {
        index: post.seo?.metaRobotsNoindex !== 'noindex',
        follow: post.seo?.metaRobotsNofollow !== 'nofollow',
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Alternative URLs
    alternates: {
      canonical: post.seo?.canonical || postUrl,
      languages: {
        'en-US': postUrl,
      },
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  try {
    const { categorySlug, postSlug } = await params;
    
    const cacheConfig = {
      revalidate: config.cache.ttl,
      tags: ['posts', 'content', `category:${categorySlug}`],
      strategy: 'stale-while-revalidate' as const,
      softTags: ['related-content']
    };

    if (!postSlug) {
      logger.error('No postSlug provided');
      return <PostError />;
    }

    const post = await loadPost(postSlug);
    
    if (!post || !post.content) {
      logger.error(`No content found for post: ${postSlug}`);
      return <PostError />;
    }

    // Enhanced JSON-LD following Google's guidelines
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt?.replace(/(<([^>]+)>|&[^;]+;)/ig, '').trim() || '',
      image: [
        post.seo?.opengraphImage?.sourceUrl || 
        post.featuredImage?.node?.sourceUrl
      ].filter(Boolean),
      datePublished: new Date(post.date).toISOString(),
      dateModified: post.modified ? new Date(post.modified).toISOString() : new Date(post.date).toISOString(),
      author: {
        '@type': 'Person',
        name: post.author?.node?.name || config.site.name,
        url: post.author?.node?.url || 
            (post.author?.node?.name ? 
              `${config.site.url}/author/${post.author.node.name.toLowerCase().replace(/\s+/g, '-')}` : 
              config.site.url),
        ...(post.author?.node?.social?.twitter && {
          sameAs: [`https://twitter.com/${post.author.node.social.twitter}`]
        })
      },
      publisher: {
        '@type': 'Organization',
        name: config.site.name,
        url: config.site.url,
        logo: {
          '@type': 'ImageObject',
          url: `${config.site.url}/logo.png`,
          width: 60,
          height: 60
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${config.site.url}/${categorySlug}/${postSlug}`
      },
      articleSection: categorySlug,
      wordCount: post.content?.split(/\s+/).length || 0,
      keywords: [
        ...(post.seo?.metaKeywords?.split(',') || []),
        ...(post.tags?.nodes?.map(tag => tag.name) || [])
      ].filter(Boolean).join(', '),
      inLanguage: 'en-US',
      copyrightYear: new Date(post.date).getFullYear(),
      copyrightHolder: {
        '@type': 'Organization',
        name: config.site.name,
        url: config.site.url
      }
    };

    return (
      <>
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ 
            __html: JSON.stringify(jsonLd, null, process.env.NODE_ENV === 'development' ? 2 : 0) 
          }}
        />
        <ErrorBoundary fallback={<PostError />}>
          <Suspense fallback={<PostLoading />}>
            <article className="max-w-4xl mx-auto px-4 py-8">
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
      </>
    );
  } catch (error) {
    logger.error('Error in PostPage:', error);
    return <PostError />;
  }
}

export async function generateStaticParams() {
  try {
    const client = await getClient();
    const { data } = await client.query({
      query: queries.posts.getLatest,
      variables: { 
        first: 50,
        where: {
          status: "PUBLISH",
          orderby: { field: "DATE", order: "DESC" }
        }
      },
      context: {
        fetchOptions: {
          next: { 
            revalidate: config.cache.ttl,
            tags: ['posts', 'content']
          }
        }
      }
    });

    if (!data?.posts?.nodes) return [];

    return data.posts.nodes.flatMap((post: WordPressPost) =>
      post.categories?.nodes.map((category) => ({
        categorySlug: category.slug,
        postSlug: post.slug,
      }))
    );
  } catch (error) {
    logger.error("Error generating static params:", error);
    return [];
  }
}
