'use client';

import { PostCard } from "./PostCard";
import type { WordPressPost, PageInfo } from "@/types/wordpress";
import { Button } from "@/app/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface PostListClientProps {
  posts: WordPressPost[];
  pageInfo: PageInfo;
  perPage?: number;
  categorySlug?: string;
  currentPage?: number;
  initialPage?: number;
}

export function PostListClient({
  posts: initialPosts,
  pageInfo,
  categorySlug,
  currentPage = 1
}: PostListClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<WordPressPost[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedPages, setLoadedPages] = useState(new Set([currentPage]));

  // Only reset when category changes
  useEffect(() => {
    setPosts(initialPosts);
    setLoadedPages(new Set([currentPage]));
    setIsLoading(false);
  }, [categorySlug, initialPosts, currentPage]);

  // Handle subsequent page loads only
  useEffect(() => {
    if (!loadedPages.has(currentPage)) {
      setPosts(prev => [...prev, ...initialPosts]);
      setLoadedPages(prev => new Set(prev).add(currentPage));
      setIsLoading(false);
    }
  }, [currentPage, loadedPages, initialPosts]);

  const handleLoadMore = () => {
    if (isLoading) return;
    setIsLoading(true);
    const nextPage = currentPage + 1;
    const baseUrl = categorySlug ? `/${categorySlug}` : '/';
    const url = `${baseUrl}?page=${nextPage}`;
    
    router.push(url, { scroll: false });
  };

  return (
    <div className="space-y-8 w-full">
      <div className="grid grid-cols-1 gap-6">
        {posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post}
          />
        ))}
      </div>

      {pageInfo.hasNextPage && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Load More Posts'
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 