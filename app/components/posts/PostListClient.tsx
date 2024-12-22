'use client';

import { PostCard } from "./PostCard";
import type { WordPressPost, PageInfo } from "@/types/wordpress";
import { Suspense, lazy } from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';

// Lazy load the LoadMorePosts component
const LoadMorePosts = lazy(() => import('./LoadMorePosts'));

interface PostListClientProps {
  posts: WordPressPost[];
  pageInfo?: PageInfo;
  categorySlug?: string;
}

export function PostListClient({ posts, pageInfo, categorySlug }: PostListClientProps) {
  if (!posts?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No posts found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      
      {pageInfo?.hasNextPage && pageInfo.endCursor && (
        <Suspense fallback={<LoadingSkeleton />}>
          <LoadMorePosts 
            categorySlug={categorySlug}
            endCursor={pageInfo.endCursor}
            initialPosts={posts}
          />
        </Suspense>
      )}
    </div>
  );
} 