'use client';

import { useState, useCallback, useMemo, useTransition } from 'react';
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
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 0 }
    });
    if (!res.ok) throw new Error('Failed to fetch feed data');
    return res.json();
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

  // Setup infinite scrolling with SWR
  const getKey = (pageIndex: number, previousPageData: FeedResponse | null) => {
    // First page uses initial data
    if (pageIndex === 0) return null;

    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null;

    // Add cursor for pagination
    const cursor = previousPageData?.nextCursor;
    return `/api/feed?cursor=${cursor}`;
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
  });

  // Setup intersection observer for infinite scroll with debounce
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '400px 0px', // Load more aggressively
    delay: 500, // Debounce the intersection observer
  });

  // Load more entries when scrolling
  const loadMore = useCallback(() => {
    if (inView && pagesData?.[pagesData.length - 1]?.hasMore && !isValidating && !isPending) {
      startTransition(() => {
        setSize(size + 1);
      });
    }
  }, [inView, pagesData, isValidating, isPending, setSize, size]);

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

  // Handle retry on error
  const handleRetry = useCallback(() => {
    mutate();
  }, [mutate]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Error loading feed. Please try again.</p>
        <button 
          onClick={handleRetry}
          className="text-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

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
        
        {(pagesData?.[pagesData.length - 1]?.hasMore || isValidating) && (
          <div 
            ref={loadMoreRef} 
            className="col-span-full h-20 flex items-center justify-center"
            onMouseEnter={loadMore}
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
} 