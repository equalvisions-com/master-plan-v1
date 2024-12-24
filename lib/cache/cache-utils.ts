import { getClient } from "@/lib/apollo/apollo-client";
import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, WordPressPost, CategoryData, WordPressCategory } from "@/types/wordpress";
import { config } from "@/config";
import { cacheHandler } from './vercel-cache-handler';
import { redis } from '@/lib/redis/client';
import { logger } from '@/lib/logger';
import { Monitoring } from '@/lib/monitoring';
import { cacheMonitor } from './monitoring';

export async function fetchPostForCache(slug: string) {
  try {
    const client = await getClient();
    const result = await client.query<{ post: WordPressPost }>({
      query: queries.posts.getBySlug,
      variables: { slug },
      context: {
        fetchOptions: {
          cache: "force-cache",
          next: { 
            revalidate: config.cache.ttl,
            tags: [
              `post:${slug}`,
              'posts',
              'content',
              ...config.cache.tags.global
            ]
          }
        }
      }
    });

    return result.data?.post || null;
  } catch (error) {
    console.error(`Error warming cache for post ${slug}:`, error);
    return null;
  }
}

export async function warmHomePagePosts() {
  const cacheKey = 'homepage-posts';
  const startTime = performance.now();
  
  try {
    const client = await getClient();
    const { data } = await client.query<PostsData>({
      query: queries.posts.getLatest,
      variables: { first: 6, after: null },
      context: {
        fetchOptions: {
          cache: 'force-cache',
          next: { 
            revalidate: config.cache.ttl,
            tags: ['homepage', 'posts', 'content', ...config.cache.tags.global]
          }
        }
      }
    });

    const duration = performance.now() - startTime;

    if (data?.posts?.nodes) {
      Monitoring.trackCacheEvent({
        type: 'hit',
        key: cacheKey,
        source: 'next',
        duration,
        size: JSON.stringify(data).length
      });
      return data;
    }
    
    Monitoring.trackCacheEvent({
      type: 'miss',
      key: cacheKey,
      source: 'next',
      duration
    });
    return null;
  } catch (error) {
    logger.error('Error warming homepage posts cache:', error);
    return null;
  }
}

export async function warmCategoryPosts(categorySlug: string) {
  const cacheKey = `category:${categorySlug}:posts`;
  try {
    const client = await getClient();
    const { data } = await client.query<CategoryData>({
      query: queries.categories.getWithPosts,
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
              `category:${categorySlug}`,
              'posts',
              'content',
              ...config.cache.tags.global
            ]
          }
        }
      }
    });

    if (data?.category?.posts?.nodes) {
      cacheHandler.trackCacheOperation(cacheKey, true);
      
      // Warm individual post caches
      await Promise.all(
        data.category.posts.nodes.map((post: WordPressPost) => 
          cacheHandler.trackCacheOperation(`post:${post.slug}`, true)
        )
      );

      return data;
    }
    return null;
  } catch (error) {
    cacheHandler.trackCacheOperation(cacheKey, false);
    console.error('Error warming category posts cache:', error);
    return null;
  }
}

export async function warmRelatedPosts(postSlug: string) {
  const cacheKey = `post:${postSlug}:related`;
  try {
    const client = await getClient();
    const { data } = await client.query<{ post: WordPressPost }>({
      query: queries.posts.getBySlug,
      variables: { slug: postSlug },
      context: {
        fetchOptions: {
          cache: 'force-cache',
          next: { 
            revalidate: config.cache.ttl,
            tags: [
              `post:${postSlug}`,
              'posts',
              'content',
              ...config.cache.tags.global
            ]
          }
        }
      }
    });

    if (data?.post) {
      cacheHandler.trackCacheOperation(cacheKey, true);
      
      // Warm category cache
      if (data.post.categories?.nodes) {
        await Promise.all(
          data.post.categories.nodes.map((category: WordPressCategory) => 
            cacheHandler.trackCacheOperation(`category:${category.slug}`, true)
          )
        );
      }

      return data;
    }
    return null;
  } catch (error) {
    cacheHandler.trackCacheOperation(cacheKey, false);
    console.error('Error warming related posts cache:', error);
    return null;
  }
}

// Re-export cacheHandler for use in other files
export { cacheHandler } from './vercel-cache-handler';

export async function getCachedData<T>(key: string): Promise<T | null> {
  const startTime = performance.now();
  try {
    const data = await redis.get<T>(key);
    const duration = performance.now() - startTime;

    if (data) {
      cacheMonitor.logCacheHit(key, 'next', duration);
    } else {
      cacheMonitor.logCacheMiss(key, 'next', duration);
    }

    return data;
  } catch (error) {
    logger.error('Error getting cached data:', error);
    cacheMonitor.logCacheMiss(key, 'next', performance.now() - startTime);
    return null;
  }
}

export async function setCachedData<T>(
  key: string, 
  value: T, 
  ttl?: number
): Promise<void> {
  const startTime = performance.now();
  try {
    if (ttl) {
      await redis.set(key, value, { ex: ttl });
    } else {
      await redis.set(key, value);
    }
    
    const duration = performance.now() - startTime;
    cacheMonitor.logCacheHit(key, 'next', duration);
  } catch (error) {
    logger.error('Error setting cached data:', error);
    const duration = performance.now() - startTime;
    cacheMonitor.logCacheMiss(key, 'next', duration);
  }
}