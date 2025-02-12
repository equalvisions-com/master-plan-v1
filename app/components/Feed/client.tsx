'use client';

import { useCallback, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { FeedCard } from './FeedCard';
import { toggleMetaLike } from '@/app/actions/meta-like';
import { normalizeUrl } from '@/lib/utils/normalizeUrl';
import { useToast } from "@/components/ui/use-toast";
import type { SitemapEntry } from '@/app/lib/sitemap/types';

interface FeedProps {
  initialEntries: (SitemapEntry & {
    commentCount: number;
    likeCount: number;
  })[];
  initialLikedUrls: string[];
  initialCursor: string | null;
  userId?: string | null;
}

export function Feed({
  initialEntries,
  initialLikedUrls,
  initialCursor,
  userId
}: FeedProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState(initialEntries);
  const [likedUrls, setLikedUrls] = useState<Set<string>>(
    new Set(initialLikedUrls.map(normalizeUrl))
  );
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoading, setIsLoading] = useState(false);

  const { ref: loadingRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px 0px',
  });

  const loadMore = useCallback(async () => {
    if (!cursor || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error('Failed to fetch more entries');
      
      const data = await res.json();
      setEntries(prev => [...prev, ...data.entries]);
      setCursor(data.cursor);
    } catch {
      toast({
        title: "Error loading more entries",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading, toast]);

  useEffect(() => {
    if (inView) {
      loadMore();
    }
  }, [inView, loadMore]);

  const handleLikeToggle = useCallback(async (url: string) => {
    if (!userId) return;

    const normalizedUrl = normalizeUrl(url);
    const wasLiked = likedUrls.has(normalizedUrl);

    try {
      setLikedUrls(prev => {
        const next = new Set(prev);
        if (wasLiked) {
          next.delete(normalizedUrl);
        } else {
          next.add(normalizedUrl);
        }
        return next;
      });

      const { success, error } = await toggleMetaLike(normalizedUrl);
      if (!success) throw new Error(error || 'Failed to toggle like');
    } catch {
      // Revert optimistic update on error
      setLikedUrls(prev => {
        const next = new Set(prev);
        if (wasLiked) {
          next.add(normalizedUrl);
        } else {
          next.delete(normalizedUrl);
        }
        return next;
      });
    }
  }, [likedUrls, userId]);

  const handleCommentToggle = useCallback(() => {
    // Comment functionality to be implemented
  }, []);

  if (!entries.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No entries found in your feed</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] -mr-4 md:-mr-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 md:pb-8">
        {entries.map((entry) => (
          <FeedCard
            key={entry.url}
            entry={entry}
            isLiked={likedUrls.has(normalizeUrl(entry.url))}
            onLikeToggle={handleLikeToggle}
            onCommentToggle={handleCommentToggle}
            userId={userId}
          />
        ))}
        
        {cursor && (
          <div ref={loadingRef} className="col-span-full h-20 flex items-center justify-center">
            {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </div>
        )}
      </div>
    </ScrollArea>
  );
} 