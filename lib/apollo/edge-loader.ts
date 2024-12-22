import { getServerClient } from './apollo-server';
import { queries } from '@/lib/graphql/queries/index';
import type { WordPressPost, WordPressCategory } from '@/types/wordpress';
import { logger } from '@/lib/logger';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { config } from '@/config';
import { Monitoring } from '@/lib/monitoring';
import { getClient } from '@/lib/apollo/apollo-client';
import type { ApolloQueryResult } from '@apollo/client';
import { cacheHandler } from '@/lib/cache/vercel-cache-handler';

// Define our query result type
interface PostQueryData {
  post: WordPressPost | null;
}

// Use ApolloQueryResult for proper typing
type PostQueryResult = ApolloQueryResult<PostQueryData>;

// Add this type guard function at the top of the file
function isValidPostData(data: unknown): data is WordPressPost {
  try {
    if (!data || typeof data !== 'object') return false;
    
    const post = data as Partial<WordPressPost>;
    const requiredFields = ['id', 'slug', 'title', 'date'] as const;
    
    // Now TypeScript knows these are valid keys
    const hasRequiredFields = requiredFields.every(field => {
      const value = post[field];
      return value !== undefined && value !== null && typeof value === 'string';
    });

    // Validate nested structures
    const hasValidCategories = !post.categories?.nodes || 
      Array.isArray(post.categories.nodes) &&
      post.categories.nodes.every(cat => 
        cat && typeof cat === 'object' && typeof cat.slug === 'string'
      );

    return hasRequiredFields && hasValidCategories;
  } catch {
    return false;
  }
}

// Add type-safe cache helper
const getCache = () => {
  if (typeof caches === 'undefined') return null;
  return caches as unknown as { default: Cache };
};

// Update the cache availability check
const isCachesAvailable = () => {
  const cache = getCache();
  return !!cache?.default;
};

async function getCachedPost(slug: string): Promise<WordPressPost | null> {
  try {
    const cacheKey = `post:${slug}`;
    const post = await cacheHandler.getWithSWR(cacheKey, () => getBasicPostData(slug));
    
    if (!post) {
      logger.warn(`Post not found: ${slug}`);
      return null;
    }
    
    return post;
  } catch (error) {
    logger.error('Error getting cached post:', error);
    return null;
  }
}

async function revalidatePostData(slug: string): Promise<void> {
  try {
    const client = await getClient();
    const result = await client.query<PostQueryData>({
      query: queries.posts.getBySlug,
      variables: { slug },
      context: {
        fetchOptions: {
          next: { 
            revalidate: 0,
            tags: [config.cache.tags.post(slug)]
          }
        }
      }
    });

    if (result.data.post) {
      await Monitoring.trackCache('revalidate', {
        key: `post:${slug}`,
        success: true,
        type: 'update',
        tags: [config.cache.tags.post(slug)]
      });
    }
  } catch (error) {
    logger.error('Error revalidating post data:', error);
  }
}

async function getBasicPostData(slug: string) {
  const startTime = Date.now();
  try {
    const result = await getServerClient().query<PostQueryData>({
      query: queries.posts.getBySlug,
      variables: { slug },
      context: {
        fetchOptions: {
          next: {
            revalidate: config.cache.ttl,
            tags: [
              config.cache.tags.post(slug),
              ...config.cache.tags.global,
            ],
            preferredRegion: "auto",
            fetchCache: "auto",
            revalidateOnFocus: false,
            revalidateIfStale: true
          }
        }
      }
    });

    if (!result.data.post) notFound();

    const post = {
      ...result.data.post,
      content: result.data.post.content || '',
      excerpt: result.data.post.excerpt || '',
      title: result.data.post.title || '',
      _cache: {
        lastModified: new Date().toISOString(),
        revalidate: config.cache.ttl,
        tags: [config.cache.tags.post(slug)]
      }
    };

    return post;
  } catch (error) {
    logger.error('Error fetching post:', error);
    throw error;
  }
}

async function getExtendedPostData(slug: string) {
  const { data } = await getServerClient().query({
    query: queries.posts.getMetaFields,
    variables: { slug },
    context: {
      fetchOptions: {
        next: {
          revalidate: 3600,
          tags: [`post:meta:${slug}`]
        }
      }
    }
  });

  return data?.post || {};
}

// Create a function factory to capture the slug for cache tags
function createPostLoader(slug: string) {
  return unstable_cache(
    async () => {
      try {
        const cachedData = await getCachedPost(slug);
        if (cachedData) {
          // Background revalidation with error boundary
          Promise.resolve().then(() => {
            revalidatePostData(slug).catch(error => {
              logger.error('Background revalidation failed:', error);
            });
          });
          return cachedData;
        }
        const basicData = await getBasicPostData(slug);
        const extendedData = await getExtendedPostData(slug);
        const mergedData = { ...basicData, ...extendedData };

        return {
          ...mergedData,
          _cache: {
            lastModified: new Date().toISOString(),
            tags: [
              config.cache.tags.post(slug),
              `post:meta:${slug}`,
              ...config.cache.tags.global,
              ...(mergedData.categories?.nodes?.map((cat: WordPressCategory) => 
                config.cache.tags.category(cat.slug)
              ) || [])
            ]
          }
        };
      } catch (error) {
        logger.error('Error in post loader:', error);
        throw error;
      }
    },
    ['posts', slug],
    {
      revalidate: config.cache.ttl,
      tags: [
        config.cache.tags.post(slug),
        'posts',
        ...config.cache.tags.global
      ]
    }
  );
}

// Update getCachedPostWithRecovery similarly
async function getCachedPostWithRecovery(slug: string): Promise<WordPressPost | null> {
  try {
    const cache = getCache();
    if (!cache?.default) {
      logger.warn('Cache storage not available, falling back to direct fetch');
      return getBasicPostData(slug);
    }

    const cacheKey = `post:${slug}`;
    const cached = await cache.default.match(cacheKey);
    if (cached) {
      const data = await cached.json();
      if (isValidPostData(data)) {
        return data;
      }
      await cache.default.delete(cacheKey);
      const freshData = await getBasicPostData(slug);
      if (freshData) {
        await cache.default.put(cacheKey, new Response(JSON.stringify(freshData)));
        return freshData;
      }
    }
    return null;
  } catch (error) {
    logger.error('Cache error:', error);
    return getBasicPostData(slug); // Fallback to direct fetch
  }
}

export const loadPost = async (slug: string): Promise<WordPressPost> => {
  const post = await getCachedPost(slug);
  if (!post) {
    logger.warn(`Post not found, returning 404: ${slug}`);
    notFound();
  }
  return post;
}; 