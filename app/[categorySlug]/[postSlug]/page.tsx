import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Script from "next/script";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { getClient } from "@/lib/apollo/apollo-client";
import { queries } from "@/lib/graphql/queries/index";
import type { WordPressPost } from "@/types/wordpress";
import { config } from '@/config';
import { PostLoading, PostError } from '@/app/components/loading/PostLoading';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { logger } from '@/lib/logger';
import { loadPost } from '@/lib/apollo/edge-loader';
import { MainNav } from '@/app/components/nav';
import { createClient } from '@/lib/supabase/server';
import { cacheMonitor } from '@/lib/cache/monitoring';

// -------------------------------------------
// 1. Match the route-level exports from Home/Category
// -------------------------------------------
export const dynamic = 'auto';
export const revalidate = 3600; // 1 hour
export const fetchCache = 'force-cache';
export const dynamicParams = true;

// -------------------------------------------
// 2. Wrap 'loadPost' in 'unstable_cache'
//    so the Post Page has the same caching
//    mechanism as Home & Category pages
// -------------------------------------------
const getPostData = unstable_cache(
  async (postSlug: string) => {
    const startTime = performance.now();
    try {
      const post = await loadPost(postSlug);
      if (post) {
        cacheMonitor.logCacheHit(`post:${postSlug}`, "next", performance.now() - startTime);
      } else {
        cacheMonitor.logCacheMiss(`post:${postSlug}`, "next", performance.now() - startTime);
      }
      return post;
    } catch (error) {
      cacheMonitor.logCacheMiss(`post:${postSlug}`, "next", performance.now() - startTime);
      logger.error("Error loading post:", error);
      throw error;
    }
  },
  ["post-data"],
  {
    revalidate: config.cache.ttl,
    tags: ["posts", "content"],
  }
);

// -------------------------------------------
// 3. Optional: export generateViewport
// -------------------------------------------
export function generateViewport(): Viewport {
  return {
    width: "device-width",
    initialScale: 1,
  };
}

// -------------------------------------------
// 4. Updated generateMetadata with
//    the same Cache-Control headers
// -------------------------------------------
interface PageProps {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug, postSlug } = await params;
  const post = await getPostData(postSlug);

  // If no post found, serve a minimal metadata object
  // plus no-store to avoid caching 404 pages
  if (!post) {
    return {
      title: "Post Not Found",
      robots: "noindex",
      other: {
        "Cache-Control": "no-store, must-revalidate",
      },
    };
  }

  // The rest is your existing SEO logic
  const baseUrl = config.site.url;
  const postUrl = `${baseUrl}/${categorySlug}/${postSlug}`;
  const cleanDescription =
    post.excerpt?.replace(/(<([^>]+)>|&[^;]+;)/gi, "").trim() || "";

  const publishDate = new Date(post.date).toISOString();
  const modifiedDate = post.modified
    ? new Date(post.modified).toISOString()
    : publishDate;

  // Gather OG/Twitter images
  const images = [];
  if (post.seo?.opengraphImage?.sourceUrl) {
    images.push({
      url: post.seo.opengraphImage.sourceUrl,
      width: post.seo.opengraphImage.mediaDetails?.width || 1200,
      height: post.seo.opengraphImage.mediaDetails?.height || 630,
      alt: post.seo.opengraphImage.altText || post.title,
      type: "image/jpeg",
    });
  }
  if (images.length === 0 && post.featuredImage?.node) {
    images.push({
      url: post.featuredImage.node.sourceUrl,
      width: post.featuredImage.node.mediaDetails?.width || 1200,
      height: post.featuredImage.node.mediaDetails?.height || 630,
      alt: post.featuredImage.node.altText || post.title,
      type: "image/jpeg",
    });
  }

  // Return the unified metadata object, including Cache-Control
  return {
    title: {
      template: `%s | ${config.site.name}`,
      default: post.seo?.title || post.title,
    },
    description: cleanDescription,

    applicationName: config.site.name,
    authors: post.author
      ? [{ name: post.author.node.name, url: post.author.node.url }]
      : undefined,
    generator: "Next.js",
    keywords: post.seo?.metaKeywords?.split(",").map((k: string) => k.trim()),
    referrer: "origin-when-cross-origin",

    openGraph: {
      title: post.seo?.opengraphTitle || post.title,
      description: cleanDescription,
      url: post.seo?.canonical || postUrl,
      siteName: post.seo?.opengraphSiteName || config.site.name,
      images: images.length > 0 ? images : undefined,
      locale: "en_US",
      type: "article",
      publishedTime: publishDate,
      modifiedTime: modifiedDate,
      authors: post.author?.node.name,
      section: categorySlug,
      tags: post.tags?.nodes?.map((tag: { name: string }) => tag.name),
    },

    twitter: {
      card: "summary_large_image",
      title: post.seo?.twitterTitle || post.seo?.opengraphTitle || post.title,
      description: post.seo?.twitterDescription || cleanDescription,
      creator: post.author?.node?.social?.twitter,
      site: "@HamptonCurrent",
      images: images,
    },

    robots: {
      index: post.seo?.metaRobotsNoindex !== "noindex",
      follow: post.seo?.metaRobotsNofollow !== "nofollow",
      googleBot: {
        index: post.seo?.metaRobotsNoindex !== "noindex",
        follow: post.seo?.metaRobotsNofollow !== "nofollow",
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    alternates: {
      canonical: post.seo?.canonical || postUrl,
      languages: {
        "en-US": postUrl,
      },
    },

    // The important addition for uniform caching
    other: {
      "Cache-Control": `public, s-maxage=${config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      "CDN-Cache-Control": `public, max-age=${config.cache.ttl}`,
      "Vercel-CDN-Cache-Control": `public, max-age=${config.cache.ttl}`,
    },
  };
}

// -------------------------------------------
// 5. The main PostPage component
// -------------------------------------------
export default async function PostPage({ params }: PageProps) {
  const startTime = performance.now();
  const supabase = await createClient();

  // Just use getUser() directly
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error && error.status !== 400) {
    // Only log real errors, not missing session errors
    logger.error("Auth error:", error);
  }

  try {
    const { categorySlug, postSlug } = await params;
    if (!postSlug) {
      logger.error("No postSlug provided");
      return <PostError />;
    }

    // Now we use 'getPostData' from above to ensure caching
    const post = await getPostData(postSlug);
    if (!post || !post.content) {
      logger.error(`No content found for post: ${postSlug}`);
      return <PostError />;
    }

    // We still log a separate "ISR" hit here if you want,
    // though note unstable_cache also logs hits/misses.
    cacheMonitor.logCacheHit(
      `post:${postSlug}`,
      "isr",
      performance.now() - startTime
    );

    // Enhanced JSON-LD
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description:
        post.excerpt?.replace(/(<([^>]+)>|&[^;]+;)/gi, "").trim() || "",
      image: [
        post.seo?.opengraphImage?.sourceUrl ||
          post.featuredImage?.node?.sourceUrl,
      ].filter(Boolean),
      datePublished: new Date(post.date).toISOString(),
      dateModified: post.modified
        ? new Date(post.modified).toISOString()
        : new Date(post.date).toISOString(),
      author: {
        "@type": "Person",
        name: post.author?.node?.name || config.site.name,
        url:
          post.author?.node?.url ||
          (post.author?.node?.name
            ? `${config.site.url}/author/${post.author.node.name
                .toLowerCase()
                .replace(/\s+/g, "-")}`
            : config.site.url),
        ...(post.author?.node?.social?.twitter && {
          sameAs: [`https://twitter.com/${post.author.node.social.twitter}`],
        }),
      },
      publisher: {
        "@type": "Organization",
        name: config.site.name,
        url: config.site.url,
        logo: {
          "@type": "ImageObject",
          url: `${config.site.url}/logo.png`,
          width: 60,
          height: 60,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${config.site.url}/${categorySlug}/${postSlug}`,
      },
      articleSection: categorySlug,
      wordCount: post.content?.split(/\s+/).length || 0,
      keywords: [
        ...(post.seo?.metaKeywords?.split(",") || []),
        ...(post.tags?.nodes?.map((tag: { name: string }) => tag.name) || []),
      ]
        .filter(Boolean)
        .join(", "),
      inLanguage: "en-US",
      copyrightYear: new Date(post.date).getFullYear(),
      copyrightHolder: {
        "@type": "Organization",
        name: config.site.name,
        url: config.site.url,
      },
    };

    return (
      <>
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              jsonLd,
              null,
              process.env.NODE_ENV === "development" ? 2 : 0
            ),
          }}
        />
        <div className="min-h-screen">
          <header className="border-b">
            <div className="container mx-auto px-4">
              <MainNav user={user} />
            </div>
          </header>

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
        </div>
      </>
    );
  } catch (err) {
    const { postSlug } = await params;
    cacheMonitor.logCacheMiss(
      `post:${postSlug}`,
      "isr",
      performance.now() - startTime
    );
    logger.error("Error in PostPage:", err);
    return <PostError />;
  }
}

// -------------------------------------------
// 6. generateStaticParams (optional for SSG)
// -------------------------------------------
export async function generateStaticParams() {
  try {
    const client = await getClient();
    const { data } = await client.query({
      query: queries.posts.getLatest,
      variables: {
        first: 50,
        where: {
          status: "PUBLISH",
          orderby: { field: "DATE", order: "DESC" },
        },
      },
      context: {
        fetchOptions: {
          next: {
            revalidate: config.cache.ttl,
            tags: ["posts", "content"],
          },
        },
      },
    });

    if (!data?.posts?.nodes) return [];

    return data.posts.nodes.flatMap((post: WordPressPost) =>
      post.categories?.nodes.map((category) => ({
        categorySlug: category.slug,
        postSlug: post.slug,
      }))
    );
  } catch (err) {
    logger.error("Error generating static params:", err);
    return [];
  }
}
