'use client';

import { PostCard } from "./PostCard";
import type { WordPressPost, PageInfo } from "@/types/wordpress";
import { Button } from "@/app/components/ui/button";
import { useState } from "react";
import { useQuery } from "@apollo/client";
import { queries } from "@/lib/graphql/queries";
import { useTransition } from 'react';
import { Loader2 } from "lucide-react";

interface PostListClientProps {
  posts: WordPressPost[];
  pageInfo: PageInfo;
  categorySlug?: string;
  perPage: number;
}

export function PostListClient({ 
  posts: initialPosts, 
  pageInfo: initialPageInfo,
  categorySlug,
  perPage
}: PostListClientProps) {
  const [posts, setPosts] = useState<WordPressPost[]>(initialPosts);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isPending, startTransition] = useTransition();

  const { fetchMore } = useQuery(
    categorySlug ? queries.categories.getWithPosts : queries.posts.getLatest,
    {
      skip: true,
      variables: categorySlug 
        ? { slug: categorySlug, first: perPage }
        : { first: perPage }
    }
  );

  const loadMore = async () => {
    if (!pageInfo?.hasNextPage || isPending) return;
    
    startTransition(async () => {
      try {
        const result = await fetchMore({
          variables: {
            ...(categorySlug ? { slug: categorySlug } : {}),
            first: perPage,
            after: pageInfo.endCursor
          }
        });

        const newData = categorySlug 
          ? result.data.category.posts
          : result.data.posts;

        if (newData?.nodes) {
          setPosts(prev => [...prev, ...newData.nodes]);
          setPageInfo(newData.pageInfo);
        }
      } catch (error) {
        console.error('Error loading more posts:', error);
      }
    });
  };

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
      
      {pageInfo?.hasNextPage && (
        <div className="flex justify-center mt-8">
          <Button 
            variant="outline"
            onClick={loadMore}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load More Posts'}
          </Button>
        </div>
      )}
    </div>
  );
} 