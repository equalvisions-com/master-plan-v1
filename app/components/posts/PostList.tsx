import { getClient } from '@/lib/apollo/apollo-client';
import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, CategoryData as WPCategoryData } from "@/types/wordpress";
import { PostListClient } from "./PostListClient";
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { config } from '@/config';
import { cacheHandler } from '@/lib/cache/vercel-cache-handler';

interface PostListProps {
  categorySlug?: string;
  initialData?: PostsData | WPCategoryData;
  cacheTags?: string[];
}

interface GraphQLResponse<T> {
  data: T;
  error?: {
    message: string;
    locations?: { line: number; column: number }[];
    path?: string[];
  };
}

// Update type guard to handle GraphQL response
const isCategoryData = (
  data: PostsData | WPCategoryData | GraphQLResponse<PostsData>
): data is WPCategoryData => {
  if ('data' in data) {
    // Handle GraphQL response
    return false; // GraphQL response is never CategoryData
  }
  return 'category' in data && data.category !== null;
};

const getPosts = unstable_cache(
  async (categorySlug?: string, extraTags: string[] = []) => {
    const cacheKey = categorySlug ? `category:${categorySlug}:posts` : 'homepage-posts';
    try {
      const client = await getClient();
      const response = await client.query<GraphQLResponse<PostsData>>({
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
                ...config.cache.tags.global,
                ...extraTags
              ]
            }
          }
        }
      });

      if (response.error) {
        cacheHandler.trackCacheOperation(cacheKey, false);
        console.error('GraphQL Error:', response.error);
        throw new Error('Failed to fetch posts');
      }

      cacheHandler.trackCacheOperation(cacheKey, true);
      return response.data; // Return just the data part
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

export async function PostList({ categorySlug, initialData, cacheTags }: PostListProps) {
  try {
    const rawData = initialData || await getPosts(categorySlug, cacheTags);
    const data = 'data' in rawData ? rawData.data : rawData;
    
    // Use type guard to safely access data
    const posts = isCategoryData(data) 
      ? data.category?.posts?.nodes 
      : (data as PostsData).posts?.nodes;

    if (!posts?.length) {
      return notFound();
    }

    const pageInfo = isCategoryData(data)
      ? data.category?.posts?.pageInfo
      : (data as PostsData).posts?.pageInfo;

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