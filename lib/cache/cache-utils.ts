import { getClient } from "@/lib/apollo/apollo-client";
import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, WordPressPost, CategoryData, WordPressCategory } from "@/types/wordpress";
import { config } from "@/config";
import { cacheHandler } from './vercel-cache-handler';

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
  try {
    const client = await getClient();
    const { data } = await client.query<PostsData>({
      query: queries.posts.getLatest,
      variables: { 
        first: 6,
        after: null
      },
      context: {
        fetchOptions: {
          cache: 'force-cache',
          next: { 
            revalidate: config.cache.ttl,
            tags: [
              'homepage',
              'posts',
              'content',
              ...config.cache.tags.global
            ]
          }
        }
      }
    });

    if (data?.posts?.nodes) {
      // Track successful cache operation
      cacheHandler.trackCacheOperation(cacheKey, true);
      
      // Also warm individual post caches
      await Promise.all(
        data.posts.nodes.map((post: WordPressPost) => 
          cacheHandler.trackCacheOperation(`post:${post.slug}`, true)
        )
      );

      return data;
    }
    return null;
  } catch (error) {
    cacheHandler.trackCacheOperation(cacheKey, false);
    console.error('Error warming homepage posts cache:', error);
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