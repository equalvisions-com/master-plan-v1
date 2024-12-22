import { getServerClient } from './apollo-server';
import { queries } from '@/lib/graphql/queries/index';
import type { WordPressPost } from '@/types/wordpress';

async function prefetchPopularPosts() {
  return getServerClient().query({
    query: queries.posts.getLatest,
    context: {
      fetchOptions: {
        next: { 
          revalidate: 3600,
          tags: ['posts:popular']
        }
      }
    }
  });
}

async function prefetchCategories() {
  return getServerClient().query({
    query: queries.categories.getAll,
    context: {
      fetchOptions: {
        next: { 
          revalidate: 3600,
          tags: ['categories']
        }
      }
    }
  });
}

async function prefetchHomePageData() {
  return getServerClient().query({
    query: queries.posts.getLatest,
    context: {
      fetchOptions: {
        next: { 
          revalidate: 3600,
          tags: ['homepage']
        }
      }
    }
  });
}

export async function prefetchRelatedContent(post: WordPressPost) {
  const categoryPromises = post.categories.nodes.map(category => 
    getServerClient().query({
      query: queries.categories.getWithPosts,
      variables: { 
        slug: category.slug,
        first: 3 // Limit to 3 related posts per category
      },
      context: {
        fetchOptions: {
          next: { 
            revalidate: 3600,
            tags: [`category:${category.slug}`, 'related-posts']
          }
        }
      }
    })
  );

  // If there are next/previous posts, prefetch them too
  const navigationPromises = [];
  if (post.next?.slug) {
    navigationPromises.push(
      getServerClient().query({
        query: queries.posts.getBySlug,
        variables: { slug: post.next.slug },
        context: {
          fetchOptions: {
            next: { 
              revalidate: 3600,
              tags: [`post:${post.next.slug}`]
            }
          }
        }
      })
    );
  }

  if (post.previous?.slug) {
    navigationPromises.push(
      getServerClient().query({
        query: queries.posts.getBySlug,
        variables: { slug: post.previous.slug },
        context: {
          fetchOptions: {
            next: { 
              revalidate: 3600,
              tags: [`post:${post.previous.slug}`]
            }
          }
        }
      })
    );
  }

  await Promise.all([...categoryPromises, ...navigationPromises]);
}

export async function warmCache() {
  const promises = [
    prefetchPopularPosts(),
    prefetchCategories(),
    prefetchHomePageData()
  ];
  await Promise.all(promises);
} 