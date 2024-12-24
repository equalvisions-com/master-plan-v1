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

// Route segment config for Next.js 15
export const dynamic = 'force-dynamic';
export const revalidate = 3600;
export const dynamicParams = false;

interface PageProps {
  params: Promise<{
    categorySlug: string;
  }>;
  searchParams?: { [key: string]: string | string[] | undefined };
}

// Cache category data with proper error handling
const getCategoryData = unstable_cache(
  async (slug: string) => {
    const cacheKey = `category:${slug}`;
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
            cache: "force-cache",
            next: { 
              revalidate: config.cache.ttl,
              tags: [cacheKey, 'categories', 'posts', 'content']
            }
          }
        }
      });

      if (!result.data?.category) {
        console.log('Category not found:', slug);
        return null;
      }

      return result.data.category;

    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  },
  ["category-data"],
  {
    revalidate: config.cache.ttl,
    tags: ["categories", "posts"]
  }
);

export async function generateMetadata(
  { params }: PageProps
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

export default async function CategoryPage({ params }: PageProps) {
  const [resolvedParams, { data: { session } }] = await Promise.all([
    params,
    (await createClient()).auth.getSession()
  ]);

  const user = session?.user ?? null;
  const category = await getCategoryData(resolvedParams.categorySlug);

  if (!category) {
    return notFound();
  }

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
}
