// --------------------------------------------
// app/[categorySlug]/page.tsx (Example path)
// --------------------------------------------
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PostList } from '@/app/components/posts';
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { queries } from "@/lib/graphql/queries/index";
import type { CategoryData } from "@/types/wordpress";
import { PostListSkeleton } from '@/app/components/loading/PostListSkeleton';
import { unstable_cache } from 'next/cache';
import { config } from '@/config';
import { MainNav } from '@/app/components/nav';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { serverQuery } from '@/lib/apollo/query';
import { PostError } from '@/app/components/posts/PostError';

// Route segment config
export const revalidate = 3600;
export const fetchCache = 'force-cache';
export const dynamicParams = true;

interface CategoryPageProps {
  params: Promise<{
    categorySlug: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

// Add generateStaticParams
export async function generateStaticParams() {
  const { data } = await serverQuery<{ categories: { nodes: Array<{ slug: string }> } }>({
    query: queries.categories.getAll,
    options: {
      static: true
    }
  });

  return (data?.categories?.nodes || []).map((category) => ({
    categorySlug: category.slug,
  }));
}

// Cache the category data fetching with static hint
const getCategoryData = unstable_cache(
  async (slug: string) => {
    const { data } = await serverQuery<CategoryData>({
      query: queries.categories.getWithPosts,
      variables: {
        slug,
        first: 9
      },
      options: {
        tags: [`category:${slug}`, 'categories', 'posts'],
        monitor: true,
        static: true
      }
    });
    
    return data?.category || null;
  },
  ['category-data'],
  {
    revalidate: config.cache.ttl,
    tags: ['categories', 'posts', 'content']
  }
);

export async function generateMetadata(
  { params }: CategoryPageProps
): Promise<Metadata> {
  const resolvedParams = await params;
  const category = await getCategoryData(resolvedParams.categorySlug);

  if (!category) {
    return {
      title: "Category Not Found",
      robots: "noindex"
    };
  }

  return {
    title: `${category.name} - ${config.site.name}`,
    description: category.description || `Posts in ${category.name}`,
    openGraph: {
      title: `${category.name} - ${config.site.name}`,
      description: category.description || `Posts in ${category.name}`,
    }
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  // Await both params and searchParams
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams
  ]);

  const page = Number(resolvedSearchParams?.page) || 1;
  const perPage = 9;
  const { categorySlug } = resolvedParams;

  // Add user fetch
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error && error.status !== 400) {
    logger.error("Auth error:", error);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4">
          <MainNav user={user} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ErrorBoundary fallback={<PostError />}>
          <Suspense fallback={<PostListSkeleton />}>
            <PostList 
              categorySlug={categorySlug}
              perPage={perPage}
              page={page}
            />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
