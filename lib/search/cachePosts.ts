import { serverQuery } from '@/lib/apollo/query';
import { queries } from '@/lib/graphql/queries';
import { getFromCache, setInCache } from '@/lib/redis/client';
import type { WordPressPost } from '@/types/wordpress';
import { SEARCH_CONSTANTS } from '@/lib/constants/search';

/**
 * Fetches all posts required for search and caches them in Redis.
 * The cache refreshes every 24 hours.
 */
export async function cacheAllPostsForSearch(): Promise<void> {
  // Check if the cache already exists
  const cachedData = await getFromCache<WordPressPost[]>(SEARCH_CONSTANTS.CACHE_KEY);
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
      revalidate: SEARCH_CONSTANTS.CACHE_TTL,
    },
  });

  const posts = data?.posts?.nodes || [];

  // Cache the fetched posts in Redis
  await setInCache(
    SEARCH_CONSTANTS.CACHE_KEY, 
    posts, 
    { ttl: SEARCH_CONSTANTS.CACHE_TTL }
  );

  console.log('Posts data cached in Redis successfully.');
} 