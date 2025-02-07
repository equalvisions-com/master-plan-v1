import type { Metadata } from "next";
import { queries } from "@/lib/graphql/queries/index";
import type { WordPressPost } from "@/types/wordpress";
import { config } from '@/config';
import { logger } from '@/lib/logger';
import { serverQuery } from '@/lib/apollo/query';
import { MainLayout } from '@/app/components/layouts/MainLayout';
import { PostContent } from '@/app/components/posts/PostContent';
import { ClientContent } from '@/app/components/ClientContent';
import { createClient } from '@/lib/supabase/server';
import { getMetaEntries } from '@/app/components/SitemapMetaPreview/Server';
import { ProfileSidebar } from '@/app/components/ProfileSidebar/ProfileSidebar';
import { normalizeUrl } from '@/lib/utils/normalizeUrl';
import { cache } from 'react';

// Route segment config
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
  }>;
}

// Combined function to get post and related posts
const getPostAndRelatedData = async (slug: string, categorySlug: string) => {
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
};

// Add this cached version that will be used by both metadata and page
const cachedGetPostAndRelatedData = cache(getPostAndRelatedData);

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

// Update generateMetadata to use cached version
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { post } = await cachedGetPostAndRelatedData(
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

// Keep only the SitemapMetaPreview dynamic import
// const SitemapMetaPreview = dynamic(
//   () => import('@/app/components/SitemapMetaPreview').then(mod => mod.SitemapMetaPreview),
//   { 
//     loading: () => <div className="h-96 w-full animate-pulse bg-muted" />
//   }
// );

// Update page component to use cached version
export default async function PostPage({ params }: PageProps) {
  try {
    const resolvedParams = await params;
    
    // Parallel data fetching
    const [
      { post, relatedPosts },
      { data: { user } },
    ] = await Promise.all([
      cachedGetPostAndRelatedData(resolvedParams.postSlug, resolvedParams.categorySlug),
      (await createClient()).auth.getUser()
    ]);

    if (!post) throw new Error('Post not found');

    // Then fetch dependent data in parallel
    const [
      { entries: metaEntries, hasMore },
      likeData
    ] = await Promise.all([
      getMetaEntries(post),
      user ? (await createClient()).from('meta_likes').select('meta_url').eq('user_id', user.id) : Promise.resolve({ data: [] })
    ]);

    // Normalize URLs before passing to client
    const initialLikedUrls = (likeData.data || []).map(like => normalizeUrl(like.meta_url));
    
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
          
          <PostContent>
            <ClientContent 
              post={post}
              metaEntries={metaEntries}
              initialLikedUrls={initialLikedUrls}
              initialHasMore={hasMore}
            />
          </PostContent>
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
