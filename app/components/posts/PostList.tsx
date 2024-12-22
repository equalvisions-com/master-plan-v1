import { getClient } from '@/lib/apollo/apollo-client';
import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, CategoryData } from "@/types/wordpress";
import { PostListClient } from "./PostListClient";
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { config } from '@/config';
import { cacheHandler } from '@/lib/cache/vercel-cache-handler';

interface PostListProps {
  categorySlug?: string;
  initialData?: PostsData | CategoryData;
  cacheTags?: string[];
}

// Cache the data fetching with proper tags and revalidation
const getPosts = unstable_cache(
  async (categorySlug?: string) => {
    const cacheKey = categorySlug ? `category:${categorySlug}:posts` : 'homepage-posts';
    try {
      const client = await getClient();
      const { data, error } = await client.query<PostsData>({
        query: categorySlug ? queries.categories.getWithPosts : queries.posts.getLatest,
        variables: { 
          slug: categorySlug,
          first: 6,
          after: null
        },
        context: {
          fetchOptions: {
            cache: 'force-cache',
            next: { 
              revalidate: config.cache.ttl,
              tags: [
                categorySlug ? `category:${categorySlug}` : 'homepage',
                'posts',
                'content',
                ...config.cache.tags.global
              ]
            }
          }
        }
      });

      if (error) {
        cacheHandler.trackCacheOperation(cacheKey, false);
        console.error('GraphQL Error:', error);
        throw new Error('Failed to fetch posts');
      }

      cacheHandler.trackCacheOperation(cacheKey, true);
      return data;
    } catch (error) {
      console.error('Error in getPosts:', error);
      throw error;
    }
  },
  ['posts'],
  {
    revalidate: config.cache.ttl,
    tags: ['posts', 'content', ...config.cache.tags.global]
  }
);

export async function PostList({ categorySlug, initialData, cacheTags = [] }: PostListProps) {
  try {
    // Use initialData if provided, otherwise fetch with caching
    const data = initialData || await getPosts(categorySlug);
    
    // Type guard to safely access data
    const isCategoryData = (data: any): data is CategoryData => 
      'category' in data && data.category !== null;
    
    const posts = isCategoryData(data) 
      ? data.category?.posts?.nodes 
      : data.posts?.nodes;

    if (!posts?.length) {
      return notFound();
    }

    const pageInfo = isCategoryData(data)
      ? data.category?.posts?.pageInfo
      : data.posts?.pageInfo;

    // Return stable structure for hydration
    return (
      <section className="posts-grid">
        <PostListClient 
          posts={posts} 
          pageInfo={pageInfo} 
          categorySlug={categorySlug} 
        />
      </section>
    );
  } catch (error) {
    console.error('Error in PostList:', error);
    throw error;
  }
} 