import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, CategoryData, WordPressPost } from "@/types/wordpress";
import { PostListClient } from "./PostListClient";
import { serverQuery } from '@/lib/apollo/query';
import { logger } from '@/lib/logger';
import { Suspense } from 'react';
import { PostListSkeleton } from '../loading/PostListSkeleton';
import { ScrollArea } from "@/components/ui/scroll-area";

interface PostListProps {
  perPage?: number;
  categorySlug?: string;
  page?: number;
  posts?: WordPressPost[];
}

// Fetch function with proper caching
async function getPosts({ 
  categorySlug, 
  perPage, 
  page 
}: Omit<Required<PostListProps>, 'posts'>) {
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
          tags: [`category:${categorySlug}`, 'categories', 'posts', 'meta-likes'],
          fetchPolicy: 'network-only' as const,
          context: {
            fetchOptions: {
              cache: 'no-store'
            }
          }
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
        // Add cache configuration
        fetchPolicy: 'cache-first',
        context: {
          fetchOptions: {
            next: { revalidate: 3600 }
          }
        }
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

export async function PostList({ 
  perPage = 9, 
  categorySlug, 
  page = 1, 
  posts 
}: PostListProps) {
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
            posts={posts}
          />
        </Suspense>
      </div>
    </ScrollArea>
  );
}

async function PostListContent({ 
  perPage = 9, 
  categorySlug, 
  page = 1, 
  posts 
}: PostListProps) {
  // If posts are provided directly, use them
  if (posts?.length) {
    return (
      <PostListClient 
        posts={posts}
        pageInfo={{
          hasNextPage: false,
          endCursor: null,
          startCursor: null,
          hasPreviousPage: false,
          currentPage: page || 1
        }}
        perPage={perPage}
        categorySlug={categorySlug}
        currentPage={page}
      />
    );
  }

  // Otherwise fetch posts
  const postsData = await getPosts({ 
    categorySlug: categorySlug || '',
    perPage, 
    page 
  });
  
  if (!postsData?.nodes?.length) {
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
      posts={postsData.nodes}
      pageInfo={postsData.pageInfo}
      perPage={perPage}
      categorySlug={categorySlug}
      currentPage={page}
    />
  );
} 