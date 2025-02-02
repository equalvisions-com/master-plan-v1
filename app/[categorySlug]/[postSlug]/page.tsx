import type { Metadata } from "next";
import { Suspense } from "react";
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
import { PostContentSkeleton } from '@/app/components/loading/PostContentSkeleton';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Optional: Use edge runtime for better performance

interface PageProps {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
  }>;
}

// Cache the post data fetching
const getPostData = async (slug: string) => {
  const { data } = await serverQuery<{ post: WordPressPost }>({
    query: queries.posts.getBySlug,
    variables: { slug },
    options: {
      fetchPolicy: 'network-only',
      context: {
        fetchOptions: {
          cache: 'no-store'
        }
      }
    }
  });
  return data.post;
};

// Generate static params for build time (same pattern as category)
export async function generateStaticParams() {
  const { data } = await serverQuery<{ posts: { nodes: WordPressPost[] } }>({
    query: queries.posts.getAll,
  });

  return (data?.posts?.nodes || []).map((post) => ({
    categorySlug: post.categories?.nodes?.[0]?.slug || 'uncategorized',
    postSlug: post.slug,
  }));
}

// Metadata generation
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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

// Page component
export default async function PostPage({ params }: PageProps) {
  try {
    const resolvedParams = await params;
    const post = await getPostData(resolvedParams.postSlug);
    
    if (!post) throw new Error('Post not found');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch meta entries and liked URLs
    const [{ entries: metaEntries, hasMore }, initialLikedUrls] = await Promise.all([
      getMetaEntries(post),
      user ? getLikedUrls(user.id) : Promise.resolve([])
    ]);

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
              {/* Removed ProfileSidebarWrapper wrapper as it was not defined */}
            </Suspense>
          }
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          
          <Suspense fallback={<PostContentSkeleton />}>
            <PostContent>
              <ClientContent 
                post={post}
                metaEntries={metaEntries}
                initialLikedUrls={initialLikedUrls}
                initialHasMore={hasMore}
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
