import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, CategoryData } from "@/types/wordpress";
import { PostListClient } from "./PostListClient";
import { serverQuery } from '@/lib/apollo/query';
import { logger } from '@/lib/logger';
import { Suspense } from 'react';
import { PostListSkeleton } from '../loading/PostListSkeleton';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cache } from 'react'

interface PostListProps {
  perPage: number;
  categorySlug?: string;
  page: number;
}

const getPostsCached = cache(async ({ 
  categorySlug, 
  perPage, 
  page 
}: PostListProps) => {
  try {
    if (categorySlug) {
      const { data } = await serverQuery<CategoryData>({
        query: queries.categories.getWithPosts,
        variables: { 
          slug: categorySlug,
          first: perPage,
          after: ((page - 1) * perPage).toString()
        },
        options: {
          tags: [`category:${categorySlug}`, 'categories', 'posts'],
          monitor: true
        }
      });
      
      return data?.category?.posts ? {
        nodes: data.category.posts.nodes,
        pageInfo: {
          ...data.category.posts.pageInfo,
          currentPage: page
        }
      } : null;
    }

    const { data } = await serverQuery<PostsData>({
      query: queries.posts.getLatest,
      variables: { 
        first: perPage,
        after: ((page - 1) * perPage).toString(),
        fields: ['id', 'title', 'excerpt', 'slug', 'featuredImage']
      },
      options: {
        tags: ['posts'],
        monitor: true
      }
    });
    
    return data?.posts ? {
      nodes: data.posts.nodes,
      pageInfo: {
        ...data.posts.pageInfo,
        currentPage: page
      }
    } : null;
  } catch (error) {
    logger.error('Error fetching posts:', error);
    return null;
  }
});

export async function PostList({ perPage = 9, categorySlug, page = 1 }: PostListProps) {
  return (
    <ScrollArea 
      className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
      type="always"
    >



      
      <div className="posts-list">
        <Suspense fallback={<PostListSkeleton />}>
          <PostListContent
            perPage={perPage}
            categorySlug={categorySlug}
            page={page}
          />
        </Suspense>
      </div>
    </ScrollArea>
  );
}

async function PostListContent({ perPage, categorySlug, page }: PostListProps) {
  const posts = await getPostsCached({ categorySlug, perPage, page });
  
  if (!posts?.nodes?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {categorySlug ? "No posts found in this category" : "No posts found"}
        </p>
      </div>
    );
  }

  return (
    <PostListClient 
      posts={posts.nodes}
      pageInfo={posts.pageInfo}
      perPage={perPage}
      categorySlug={categorySlug}
      currentPage={page}
    />
  );
} 