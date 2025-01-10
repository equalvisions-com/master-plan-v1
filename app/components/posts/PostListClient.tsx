'use client';

import { PostCard } from "./PostCard";
import type { WordPressPost, PageInfo } from "@/types/wordpress";
import { Button } from "@/app/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface PostListClientProps {
  posts: WordPressPost[];
  pageInfo: PageInfo & { currentPage: number };
  perPage: number;
  categorySlug?: string;
  currentPage: number;
}

export function PostListClient({
  posts: initialPosts,
  pageInfo,
  categorySlug,
  currentPage
}: PostListClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedPages, setLoadedPages] = useState(new Set<number>());
  const [isInitialized, setIsInitialized] = useState(false);

  // Reset state when page changes to 1 (home) or category changes
  useEffect(() => {
    if (currentPage === 1) {
      setPosts([]);
      setLoadedPages(new Set<number>());
      setIsInitialized(false);
      setIsLoading(false);
    }
  }, [currentPage, categorySlug]);

  // Handle initial load and subsequent updates
  useEffect(() => {
    if (!isInitialized) {
      // On first load, if it's page 1, show first page only
      // If it's a higher page, slice to show only that page's posts
      const startIndex = (currentPage - 1) * 9;
      const endIndex = currentPage * 9;
      setPosts(initialPosts.slice(startIndex, endIndex));
      setLoadedPages(new Set([currentPage]));
      setIsInitialized(true);
    } else if (!loadedPages.has(currentPage)) {
      // For subsequent loads (load more), append the new posts
      setPosts(prev => [...prev, ...initialPosts.slice((currentPage - 1) * 9, currentPage * 9)]);
      setLoadedPages(prev => new Set(prev).add(currentPage));
      setIsLoading(false);
    }
  }, [initialPosts, currentPage, loadedPages, isInitialized]);

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
          <PostCard key={post.id} post={post} />
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