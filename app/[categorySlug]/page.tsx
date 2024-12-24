// --------------------------------------------
// app/[categorySlug]/page.tsx (Example path)
// --------------------------------------------
import { Suspense } from 'react';
import { notFound } from "next/navigation";
import type { Metadata } from 'next';
import { PostList } from '@/app/components/posts';
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { queries } from "@/lib/graphql/queries/index";
import type { CategoryData } from "@/types/wordpress";
import { PostListSkeleton } from '@/app/components/loading/PostListSkeleton';
import { unstable_cache } from 'next/cache';
import { getClient } from "@/lib/apollo/apollo-client";
import { config } from '@/config';
import { MainNav } from '@/app/components/nav';
import { createClient } from '@/lib/supabase/server';
import { cacheMonitor } from '@/lib/cache/monitoring';
import { logger } from '@/lib/logger';

export const dynamic = 'auto';
export const revalidate = 3600;
export const fetchCache = 'force-cache';
export const dynamicParams = true;

interface PageProps {
  params: Promise<{
    categorySlug: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const getCategoryData = unstable_cache(
  async (slug: string) => {
    const cacheKey = `category:${slug}`;
    const startTime = performance.now();

    try {
      const client = await getClient();
      const result = await client.query<CategoryData>({
        query: queries.categories.getWithPosts,
        variables: {
          slug,
          first: 6,
          after: null
        },
        context: {
          fetchOptions: {
            next: {
              revalidate: config.cache.ttl,
              tags: [`category:${slug}`, 'categories', 'posts']
            }
          }
        }
      });

      if (!result.data?.category) {
        cacheMonitor.logCacheMiss(cacheKey, 'next', performance.now() - startTime);
        return null;
      }

      cacheMonitor.logCacheHit(cacheKey, 'next', performance.now() - startTime);
      return result.data.category;

    } catch (error) {
      cacheMonitor.logCacheMiss(cacheKey, 'next', performance.now() - startTime);
      console.error('Error fetching category:', error);
      throw error; // Propagate the error
    }
  },
  ["category-data"],
  {
    revalidate: config.cache.ttl,
    tags: ["categories", "posts"],
  }
);

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const resolvedParams = await params;
  const category = await getCategoryData(resolvedParams.categorySlug);

  if (!category) {
    // For 404 or “not found,” use no-store (don’t cache 404 states).
    return {
      title: "Category Not Found",
      robots: "noindex",
      other: {
        'Cache-Control': 'no-store, must-revalidate',
      }
    };
  }

  return {
    title: `${category.name} - ${config.site.name}`,
    description: category.description || `Posts in ${category.name}`,
    openGraph: {
      title: `${category.name} - ${config.site.name}`,
      description: category.description || `Posts in ${category.name}`,
    },
    other: {
      'Cache-Control': `public, s-maxage=${config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
    }
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const startTime = performance.now();
  
  try {
    const [resolvedParams, supabase] = await Promise.all([
      params,
      createClient()
    ]);

    // Get and verify user directly with getUser()
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.error("Auth error:", error);
    }

    const category = await getCategoryData(resolvedParams.categorySlug);
    if (!category) {
      cacheMonitor.logCacheMiss(`category:${resolvedParams.categorySlug}`, 'isr', performance.now() - startTime);
      return notFound();
    }

    cacheMonitor.logCacheHit(`category:${resolvedParams.categorySlug}`, 'isr', performance.now() - startTime);

    return (
      <div className="min-h-screen">
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
              <PostList perPage={6} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    );
  } catch (error) {
    const { categorySlug } = await params;
    cacheMonitor.logCacheMiss(`category:${categorySlug}`, 'isr', performance.now() - startTime);
    throw error;
  }
}
