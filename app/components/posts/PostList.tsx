import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, CategoryData } from "@/types/wordpress";
import { PostListClient } from "./PostListClient";
import { config } from '@/config';
import { serverQuery } from '@/lib/apollo/query';
import { logger } from '@/lib/logger';
import { Suspense } from 'react';
import { PostListSkeleton } from '../loading/PostListSkeleton';
import { ScrollArea } from "@/components/ui/scroll-area";

interface PostListProps {
  perPage?: number;
  categorySlug?: string;
  page?: number;
}

async function getPosts({ 
  categorySlug, 
  perPage, 
  page 
}: { 
  categorySlug?: string;
  perPage: number;
  page: number;
}) {
  try {
    if (categorySlug) {
      const { data } = await serverQuery<CategoryData>({
        query: queries.categories.getWithPosts,
        variables: { 
          slug: categorySlug,
          first: perPage * page,
          after: null
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
        first: perPage * page,
        after: null
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
}

export async function PostList({ perPage = 9, categorySlug, page = 1 }: PostListProps) {
  const posts = await getPosts({ categorySlug, perPage, page });
  
  if (!posts?.nodes?.length) {
    return (
      <ScrollArea 
        className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]"
      >
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {categorySlug ? "No posts found in this category" : "No posts found"}
          </p>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea 
      className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
      type="always"
    >
      <div className="posts-list">
        <PostListClient 
          posts={posts.nodes}
          pageInfo={posts.pageInfo}
          perPage={perPage}
          categorySlug={categorySlug}
          currentPage={page}
        />
      </div>
    </ScrollArea>
  );
} 