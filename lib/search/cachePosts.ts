import { serverQuery } from '@/lib/apollo/query';
import { queries } from '@/lib/graphql/queries';
import { redis } from '@/lib/redis/client';
import type { WordPressPost } from '@/types/wordpress';

/**
 * Fetches all posts required for search and caches them in Redis.
 * The cache refreshes every 24 hours.
 */
export async function cacheAllPostsForSearch(): Promise<void> {
  const cacheKey = 'all_posts_for_search';
  const cacheTTL = 86400; // 24 hours in seconds

  // Check if the cache already exists
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    console.log('Posts data retrieved from Redis cache.');
    return;
  }

  // Fetch all posts using the GraphQL query
  const { data } = await serverQuery<{ posts: { nodes: WordPressPost[] } }>({
    query: queries.posts.getAllForSearch,
    variables: {},
    options: {
      tags: ['posts', 'search'],
      revalidate: cacheTTL,
    },
  });

  const posts = data?.posts?.nodes || [];

  // Cache the fetched posts in Redis
  await redis.set(cacheKey, posts, {
    ex: cacheTTL // Using 'ex' for TTL in seconds
  });

  console.log('Posts data cached in Redis successfully.');
} 