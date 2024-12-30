import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, CategoryData } from "@/types/wordpress";
import { PostListClient } from "./PostListClient";
import { config } from '@/config';
import { unstable_cache } from 'next/cache';
import { serverQuery } from '@/lib/apollo/query';
import { logger } from '@/lib/logger';
import { PostError } from './PostError';
import Script from 'next/script';
import { Suspense } from 'react';
import { PostListSkeleton } from '../loading/PostListSkeleton';

interface PostListProps {
  perPage?: number;
  categorySlug?: string;
  page?: number;
}

const generateStructuredData = (posts: PostsData['posts']['nodes'], page: number, siteConfig: typeof config) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": `Latest Posts - Page ${page}`,
  "description": "Latest blog posts",
  "isPartOf": {
    "@type": "WebSite",
    "name": siteConfig.site.name,
    "url": siteConfig.site.url
  },
  "url": `${siteConfig.site.url}${page > 1 ? `?page=${page}` : ''}`,
  "hasPart": posts.map(post => ({
    "@type": "BlogPosting",
    "headline": post.title,
    "url": `${siteConfig.site.url}/${post.categories?.nodes[0]?.slug ?? 'uncategorized'}/${post.slug}`,
    "datePublished": post.date,
    "dateModified": post.modified,
    "author": post.author?.node?.name ? {
      "@type": "Person",
      "name": post.author.node.name
    } : undefined,
    "image": post.featuredImage?.node?.sourceUrl
  }))
});

const PostListWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PostListSkeleton />}>
    {children}
  </Suspense>
);

export async function PostList({ 
  perPage = 9, 
  categorySlug,
  page = 1
}: PostListProps) {
  try {
    if (categorySlug) {
      const categoryPosts = await unstable_cache(
        async (slug: string, postsPerPage: number, pageNum: number) => {
          try {
            const { data } = await serverQuery<CategoryData>({
              query: queries.categories.getWithPosts,
              variables: { 
                slug,
                first: postsPerPage * pageNum,
                after: null
              },
              options: {
                tags: [`category:${slug}`, 'categories', 'posts'],
                monitor: true
              }
            });
            
            if (!data?.category?.posts?.nodes) {
              return null;
            }

            return {
              nodes: data.category.posts.nodes,
              pageInfo: {
                ...data.category.posts.pageInfo,
                currentPage: pageNum
              }
            };
          } catch (error) {
            logger.error('Error fetching category posts:', error);
            return null;
          }
        },
        ['category-posts', categorySlug, `page-${page}`],
        {
          revalidate: config.cache.ttl,
          tags: ['categories', 'posts', 'content', `category:${categorySlug}`]
        }
      )(categorySlug, perPage, page);

      if (!categoryPosts?.nodes?.length) {
        return (
          <PostListWrapper>
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts found in this category</p>
            </div>
          </PostListWrapper>
        );
      }

      return (
        <PostListWrapper>
          <div className="posts-list">
            <PostListClient 
              posts={categoryPosts.nodes}
              pageInfo={categoryPosts.pageInfo}
              perPage={perPage}
              categorySlug={categorySlug}
              currentPage={page}
            />
          </div>
        </PostListWrapper>
      );
    }

    const latestPosts = await unstable_cache(
      async (postsPerPage: number, pageNum: number) => {
        const { data } = await serverQuery<PostsData>({
          query: queries.posts.getLatest,
          variables: { 
            first: postsPerPage * pageNum,
            after: null
          },
          options: {
            tags: ['posts'],
            monitor: true
          }
        });
        
        if (!data?.posts?.nodes) {
          return null;
        }

        return {
          nodes: data.posts.nodes,
          pageInfo: {
            ...data.posts.pageInfo,
            currentPage: pageNum
          }
        };
      },
      ['posts', `page-${page}`],
      {
        revalidate: config.cache.ttl,
        tags: ['posts', 'content']
      }
    )(perPage, page);

    if (!latestPosts?.nodes?.length) {
      return (
        <PostListWrapper>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts found</p>
          </div>
        </PostListWrapper>
      );
    }

    const structuredData = generateStructuredData(latestPosts.nodes, page, config);
    const baseUrl = categorySlug 
      ? `${config.site.url}/${categorySlug}`
      : config.site.url;

    const paginationMetadata = {
      current: `${baseUrl}${page > 1 ? `?page=${page}` : ''}`,
      prev: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
      next: latestPosts.pageInfo.hasNextPage ? `${baseUrl}?page=${page + 1}` : null
    };

    return (
      <PostListWrapper>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Script id="pagination-metadata" type="application/ld+json">
          {JSON.stringify({
            "@context": "http://schema.org",
            "@type": "CollectionPage",
            "url": paginationMetadata.current,
            ...(paginationMetadata.prev && { "prevPage": paginationMetadata.prev }),
            ...(paginationMetadata.next && { "nextPage": paginationMetadata.next })
          })}
        </Script>
        <div className="posts-list">
          <PostListClient 
            posts={latestPosts.nodes}
            pageInfo={latestPosts.pageInfo}
            perPage={perPage}
            categorySlug={categorySlug}
            currentPage={page}
          />
        </div>
      </PostListWrapper>
    );

  } catch (error) {
    logger.error('Error in PostList:', error);
    return <PostError />;
  }
} 