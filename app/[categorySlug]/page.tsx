import { Suspense } from 'react';
import { notFound } from "next/navigation";
import type { Metadata } from 'next';
import { PostList } from '@/app/components/posts';
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { queries } from "@/lib/graphql/queries/index";
import type { CategoryData, WordPressPost, WordPressCategory } from "@/types/wordpress";
import { PostListSkeleton } from '@/app/components/loading/PostListSkeleton';
import { unstable_cache } from 'next/cache';
import { getClient } from "@/lib/apollo/apollo-client";
import { config } from '@/config';
import { cacheHandler } from '@/lib/cache/vercel-cache-handler';
import { warmCategoryPosts } from '@/lib/cache/cache-utils';
import { MainNav } from '@/app/components/nav';
import { createClient } from '@/lib/supabase/server';
import { RevalidateContent } from '@/app/components/RevalidateContent';

// Route segment config for Next.js 15
export const dynamic = 'force-static';
export const revalidate = 3600;
export const dynamicParams = false;

interface PageProps {
  params: Promise<{
    categorySlug: string;
  }>;
}

// Cache category data with proper error handling
const getCategoryData = unstable_cache(
  async (slug: string) => {
    const cacheKey = `category:${slug}`;
    try {
      const client = await getClient();
      const result = await client.query<CategoryData>({
        query: queries.categories.getWithPosts,
        variables: { slug },
        context: {
          fetchOptions: {
            cache: "force-cache",
            next: { 
              revalidate: config.cache.ttl,
              tags: [
                cacheKey,
                'categories',
                'posts',
                'content',
                ...config.cache.tags.global
              ]
            }
          }
        }
      });

      if (!result.data?.category) throw new Error("Category not found");

      cacheHandler.trackCacheOperation(cacheKey, true);

      return {
        data: result.data.category,
        tags: [
          cacheKey,
          'categories',
          'posts',
          ...result.data.category.posts?.nodes.map((post: WordPressPost) => `post:${post.slug}`) || [],
          ...config.cache.tags.global
        ],
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      cacheHandler.trackCacheOperation(cacheKey, false);
      if (process.env.NODE_ENV !== "production") {
        console.error("Error fetching category:", error);
      }
      return null;
    }
  },
  ["category-data"],
  {
    revalidate: config.cache.ttl,
    tags: ["categories", "posts"]
  }
);

// Add helper function to match post page
const getLastModified = (category: WordPressCategory): string => {
  // Use the most recent post's date as the category's last modified date
  const latestPost = category.posts?.nodes[0];
  return latestPost?.modified || latestPost?.date || new Date().toISOString();
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const categoryResponse = await getCategoryData(categorySlug);

  if (!categoryResponse) {
    return { title: "Category Not Found", robots: "noindex" };
  }

  const category = categoryResponse.data;
  
  // Warm category-specific posts (in both dev and prod)
  await warmCategoryPosts(categorySlug);

  return {
    title: `${category.name} - Your Site Name`,
    description: category.description || `Posts in ${category.name}`,
    openGraph: {
      title: `${category.name} - Your Site Name`,
      description: category.description || `Posts in ${category.name}`,
    },
    other: {
      'Cache-Control': `public, s-maxage=${config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vary': 'Accept-Encoding, x-next-cache-tags'
    }
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  try {
    const { categorySlug } = await params;
    const categoryResponse = await getCategoryData(categorySlug);

    if (!categoryResponse) {
      return notFound();
    }

    const category = categoryResponse.data;
    const lastModified = getLastModified(category);
    const isStale = process.env.ENABLE_STALE_CHECK === 'true' && (
      new Date(lastModified).getTime() < Date.now() - (config.cache.ttl * 1000) ||
      new Date(lastModified).getTime() < Date.now() - (config.cache.staleWhileRevalidate * 1000)
    );

    // Only log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log({
        lastModified: new Date(lastModified).toISOString(),
        now: new Date().toISOString(),
        ttl: config.cache.ttl,
        staleWhileRevalidate: config.cache.staleWhileRevalidate,
        isStaleCheckEnabled: process.env.ENABLE_STALE_CHECK === 'true',
        isStale,
        timeSinceLastModified: Math.floor((Date.now() - new Date(lastModified).getTime()) / 1000 / 60),
      });
    }

    return (
      <div className="min-h-screen">
        {isStale && (
          <RevalidateContent 
            tags={[
              `category:${categorySlug}`,
              'categories',
              'posts',
              ...category.posts?.nodes.map((post: WordPressPost) => `post:${post.slug}`) || []
            ]} 
          />
        )}

        <header className="border-b">
          <div className="container mx-auto px-4">
            <MainNav user={user} />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold">{category.name}</h1>
            {category.description && (
              <p className="text-muted-foreground mt-2">
                {category.description}
              </p>
            )}
          </div>

          <ErrorBoundary>
            <Suspense fallback={<PostListSkeleton />}>
              <PostList 
                categorySlug={categorySlug}
                initialData={{ category }}
                cacheTags={[`category:${categorySlug}`, 'posts']}
              />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    );
  } catch (error) {
    console.error('Error in CategoryPage:', error);
    throw error;
  }
}

export async function generateStaticParams() {
  try {
    const client = await getClient();
    const { data } = await client.query({
      query: queries.categories.getAll,
      context: {
        fetchOptions: {
          next: { 
            revalidate: config.cache.ttl,
            tags: ['categories']
          }
        }
      }
    });

    return data?.categories?.nodes?.map((category: { slug: string }) => ({
      categorySlug: category.slug,
    })) || [];
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}