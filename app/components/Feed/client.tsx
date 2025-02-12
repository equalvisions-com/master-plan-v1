'use client';

import { useState, useCallback, useMemo, useTransition, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import useSWRInfinite from 'swr/infinite';
import { EntryCard } from '@/app/components/SitemapMetaPreview/Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { FeedResponse, FeedClientProps } from './types';

// Global SWR configuration
const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  dedupingInterval: 2000,
  parallel: true,
};

// Optimized fetcher with proper error handling and timeout
const fetcher = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 0 }
    });
    
    if (!res.ok) {
      const error = new Error('Failed to fetch feed data');
      error.cause = await res.text();
      throw error;
    }
    
    const data = await res.json();
    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export function FeedClient({ initialData, userId }: FeedClientProps) {
  const [expandedCommentUrl, setExpandedCommentUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Setup infinite scrolling with SWR
  const getKey = (pageIndex: number, previousPageData: FeedResponse | null) => {
    // First page uses initial data
    if (pageIndex === 0) return null;

    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null;

    // Add cursor for pagination
    const cursor = previousPageData?.nextCursor;
    if (!cursor) return null;

    return `/api/feed?cursor=${encodeURIComponent(cursor)}`;
  };

  const {
    data: pagesData,
    size,
    setSize,
    isValidating,
    error,
    mutate
  } = useSWRInfinite<FeedResponse>(getKey, fetcher, {
    ...SWR_CONFIG,
    fallbackData: [initialData],
    revalidateFirstPage: false,
    persistSize: true,
    suspense: false,
    onError: (err) => {
      console.error('Feed fetch error:', err);
      setRetryCount(prev => prev + 1);
    }
  });

  // Setup intersection observer for infinite scroll with debounce
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '400px 0px', // Load more aggressively
    delay: 300, // Debounce the intersection observer
  });

  // Load more entries when scrolling
  useEffect(() => {
    if (!inView || isLoadingMore || !pagesData || isPending) return;

    const lastPage = pagesData[pagesData.length - 1];
    if (!lastPage?.hasMore) return;

    const loadMore = async () => {
      try {
        setIsLoadingMore(true);
        await setSize(size + 1);
      } finally {
        setIsLoadingMore(false);
      }
    };

    startTransition(() => {
      loadMore();
    });
  }, [inView, pagesData, size, setSize, isLoadingMore, isPending]);

  // Memoize flattened and deduplicated entries
  const entries = useMemo(() => {
    if (!pagesData) return initialData.entries;
    
    const urlSet = new Set<string>();
    return pagesData
      .flatMap(page => page?.entries || [])
      .filter(entry => {
        if (!entry?.url || urlSet.has(entry.url)) return false;
        urlSet.add(entry.url);
        return true;
      });
  }, [pagesData, initialData.entries]);

  // Optimize comment toggle handler
  const handleCommentsToggle = useCallback((url: string) => {
    startTransition(() => {
      setExpandedCommentUrl(prev => prev === url ? null : url);
    });
  }, []);

  // Handle retry on error with exponential backoff
  const handleRetry = useCallback(async () => {
    const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, backoffTime));
    setRetryCount(0);
    mutate();
  }, [mutate, retryCount]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Error loading feed. Please try again.</p>
        <button 
          onClick={handleRetry}
          className="text-sm text-primary hover:underline"
          disabled={isValidating}
        >
          {isValidating ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  const hasMore = pagesData?.[pagesData.length - 1]?.hasMore ?? false;
  const isLoading = isLoadingMore || isValidating;

  return (
    <ScrollArea className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] -mr-4 md:-mr-8" type="always">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 md:pb-8">
        {entries.map((entry) => (
          <EntryCard
            key={entry.url}
            entry={entry}
            isLiked={entry.isLiked || false}
            onLikeToggle={async () => {
              // Like toggle is handled by the EntryCard component
            }}
            userId={userId}
            isCommentsExpanded={expandedCommentUrl === entry.url}
            onCommentsToggle={handleCommentsToggle}
            post={{
              title: entry.meta.title,
              featuredImage: entry.meta.image ? {
                node: {
                  sourceUrl: entry.meta.image
                }
              } : undefined
            }}
          />
        ))}
        
        {(hasMore || isLoading) && (
          <div 
            ref={loadMoreRef} 
            className="col-span-full h-20 flex items-center justify-center"
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
} 