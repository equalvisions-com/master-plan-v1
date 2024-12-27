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
  // Generate a unique key for this instance based on category and current page
  const instanceKey = `${categorySlug || 'home'}-${currentPage}`;
  const router = useRouter();
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedPages, setLoadedPages] = useState(new Set<number>());
  const [isInitialized, setIsInitialized] = useState(false);

  // Reset state when category changes or on home navigation
  useEffect(() => {
    setPosts([]);
    setLoadedPages(new Set<number>());
    setIsInitialized(false);
    setIsLoading(false);
  }, [instanceKey]);

  // Handle initial load and subsequent updates
  useEffect(() => {
    if (!isInitialized) {
      // On first load, set all posts up to current page
      setPosts(initialPosts);
      setLoadedPages(new Set([currentPage]));
      setIsInitialized(true);
    } else if (!loadedPages.has(currentPage)) {
      // For subsequent page loads
      setPosts(prev => [...prev, ...initialPosts]);
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, index) => (
          <PostCard key={`${post.id}-${index}`} post={post} />
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
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Posts'
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 