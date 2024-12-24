import { getClient } from '@/lib/apollo/apollo-client';
import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, CategoryData } from "@/types/wordpress";
import { PostListClient } from "./PostListClient";
import { notFound } from 'next/navigation';
import { config } from '@/config';
import { unstable_cache } from 'next/cache';

interface PostListProps {
  perPage?: number;
  categorySlug?: string;
}

// Cache the post fetching logic
const getPosts = unstable_cache(
  async (perPage: number) => {
    const client = await getClient();
    const { data } = await client.query<PostsData>({
      query: queries.posts.getLatest,
      variables: { first: perPage },
      context: {
        fetchOptions: {
          next: { 
            tags: ['posts', 'content']
          }
        }
      }
    });
    return data;
  },
  ['posts'],
  {
    revalidate: config.cache.ttl,
    tags: ['posts', 'content']
  }
);

// Cache the category posts fetching logic
const getCategoryPosts = unstable_cache(
  async (categorySlug: string, perPage: number) => {
    const client = await getClient();
    const { data } = await client.query<CategoryData>({
      query: queries.categories.getWithPosts,
      variables: { 
        slug: categorySlug,
        first: perPage
      },
      context: {
        fetchOptions: {
          next: { 
            tags: [`category:${categorySlug}`, 'categories', 'posts', 'content']
          }
        }
      }
    });
    return data;
  },
  ['category-posts'],
  {
    revalidate: config.cache.ttl,
    tags: ['categories', 'posts', 'content']
  }
);

export async function PostList({ perPage = 6, categorySlug }: PostListProps) {
  try {
    if (categorySlug) {
      const data = await getCategoryPosts(categorySlug, perPage);

      if (!data?.category?.posts?.nodes?.length) {
        return notFound();
      }

      return (
        <section>
          <PostListClient 
            posts={data.category.posts.nodes}
            pageInfo={data.category.posts.pageInfo}
            categorySlug={categorySlug}
            perPage={perPage}
          />
        </section>
      );
    }

    const data = await getPosts(perPage);

    if (!data?.posts?.nodes?.length) {
      return notFound();
    }

    return (
      <section>
        <PostListClient 
          posts={data.posts.nodes}
          pageInfo={data.posts.pageInfo}
          perPage={perPage}
        />
      </section>
    );
  } catch (error) {
    console.error('Error in PostList:', error);
    throw error;
  }
} 