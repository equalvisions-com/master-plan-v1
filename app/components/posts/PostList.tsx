import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, CategoryData } from "@/types/wordpress";
import { PostListClient } from "./PostListClient";
import { notFound } from 'next/navigation';
import { config } from '@/config';
import { unstable_cache } from 'next/cache';
import { serverQuery } from '@/lib/apollo/query';
import { logger } from '@/lib/logger';
import { PostsFetchError } from '@/lib/errors/PostsFetchError';
import { PostError } from './PostError';

interface PostListProps {
  perPage?: number;
  categorySlug?: string;
  page?: number;
}

export async function PostList({ 
  perPage = 6, 
  categorySlug,
  page = 1
}: PostListProps) {
  try {
    // If we have a category slug, use category posts
    if (categorySlug) {
      const categoryPosts = await unstable_cache(
        async (slug: string, postsPerPage: number, pageNum: number) => {
          try {
            // Get all posts up to the current page
            const { data } = await serverQuery<CategoryData>({
              query: queries.categories.getWithPosts,
              variables: { 
                slug,
                first: postsPerPage * pageNum, // Get all posts up to current page
                after: null
              },
              options: {
                tags: [`category:${slug}`, 'categories', 'posts'],
                monitor: true
              }
            });
            
            if (!data?.category?.posts) {
              return null;
            }

            // Get the slice for the current page
            const startIndex = (pageNum - 1) * postsPerPage;
            const endIndex = startIndex + postsPerPage;
            const pageNodes = data.category.posts.nodes.slice(startIndex, endIndex);

            return {
              nodes: pageNodes,
              pageInfo: {
                ...data.category.posts.pageInfo,
                currentPage: pageNum
              }
            };
          } catch (error) {
            logger.error('Error fetching category posts:', error);
            throw new PostsFetchError('Failed to fetch category posts', { cause: error });
          }
        },
        ['category-posts', categorySlug, `page-${page}`],
        {
          revalidate: config.cache.ttl,
          tags: ['categories', 'posts', 'content', `category:${categorySlug}`]
        }
      )(categorySlug, perPage, page);

      if (!categoryPosts) {
        return notFound();
      }

      return (
        <div className="posts-list">
          <PostListClient 
            posts={categoryPosts.nodes}
            pageInfo={categoryPosts.pageInfo}
            perPage={perPage}
            categorySlug={categorySlug}
            currentPage={page}
          />
        </div>
      );
    }

    // Latest posts logic
    const latestPosts = await unstable_cache(
      async (postsPerPage: number, pageNum: number) => {
        // Get all posts up to the current page
        const { data } = await serverQuery<PostsData>({
          query: queries.posts.getLatest,
          variables: { 
            first: postsPerPage * pageNum, // Get all posts up to current page
            after: null
          },
          options: {
            tags: ['posts'],
            monitor: true
          }
        });
        
        if (data?.posts) {
          // Get the slice for the current page
          const startIndex = (pageNum - 1) * postsPerPage;
          const endIndex = startIndex + postsPerPage;
          const pageNodes = data.posts.nodes.slice(startIndex, endIndex);

          return {
            nodes: pageNodes,
            pageInfo: {
              ...data.posts.pageInfo,
              currentPage: pageNum
            }
          };
        }
        return null;
      },
      ['posts', `page-${page}`],
      {
        revalidate: config.cache.ttl,
        tags: ['posts', 'content']
      }
    )(perPage, page);

    if (!latestPosts) {
      return notFound();
    }

    // Add structured data for SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `Latest Posts - Page ${page}`,
      "description": "Latest blog posts",
      "isPartOf": {
        "@type": "WebSite",
        "name": config.site.name,
        "url": config.site.url
      },
      "url": `${config.site.url}${page > 1 ? `?page=${page}` : ''}`,
      "hasPart": latestPosts.nodes.map(post => ({
        "@type": "BlogPosting",
        "headline": post.title,
        "url": `${config.site.url}/${post.categories.nodes[0]?.slug}/${post.slug}`,
        "datePublished": post.date,
        "dateModified": post.modified,
        "author": post.author?.node?.name ? {
          "@type": "Person",
          "name": post.author.node.name
        } : undefined,
        "image": post.featuredImage?.node.sourceUrl
      }))
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="posts-list">
          <PostListClient 
            posts={latestPosts.nodes}
            pageInfo={latestPosts.pageInfo}
            perPage={perPage}
            currentPage={page}
          />
        </div>
      </>
    );

  } catch (error) {
    logger.error('Error in PostList:', error);
    return <PostError />;
  }
} 