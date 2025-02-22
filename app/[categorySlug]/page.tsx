// --------------------------------------------
// app/[categorySlug]/page.tsx (Example path)
// --------------------------------------------
import type { Metadata } from 'next';
import { PostList } from '@/app/components/posts';
import { queries } from "@/lib/graphql/queries/index";
import type { CategoryData } from "@/types/wordpress";
import { unstable_cache } from 'next/cache';
import { config } from '@/config';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { serverQuery } from '@/lib/apollo/query';
import { MainLayout } from "@/app/components/layouts/MainLayout";

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
        context: {
          fetchOptions: {
            next: { revalidate: 3600 }
          }
        }
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
  { params, searchParams }: CategoryPageProps
): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const page = Number(resolvedParams?.page) || 1;
  const { categorySlug } = await params;

  const baseUrl = `${config.site.url}/${categorySlug}`;

  // Get category data to check if there are more pages
  const category = await getCategoryData(categorySlug);

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
    },
    alternates: {
      canonical: `${baseUrl}${page > 1 ? `?page=${page}` : ''}`
    }
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams
  ]);

  const page = Number(resolvedSearchParams?.page) || 1;
  const perPage = 9;
  const { categorySlug } = resolvedParams;

  const supabase = await createClient();
  const { error } = await supabase.auth.getUser();

  if (error && error.status !== 400) {
    logger.error("Auth error:", error);
  }

  return (
    <div className="container-fluid">
      <MainLayout>
        <PostList 
          categorySlug={categorySlug}
          perPage={perPage}
          page={page}
        />
      </MainLayout>
    </div>
  );
}
