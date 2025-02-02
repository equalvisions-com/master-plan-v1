'use client';

import { useState, useRef, useEffect, useCallback, memo, useTransition, useOptimistic } from 'react';
import Image from 'next/image';
import type { SitemapEntry } from '@/lib/sitemap/types';
import { Card } from "@/app/components/ui/card";
import { Heart, Share, MessageCircle, Loader2 } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInView } from 'react-intersection-observer';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { toggleMetaLike } from '@/app/actions/meta-like'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface MetaPreviewProps {
  initialEntries: SitemapEntry[];
  initialLikedUrls: string[];
  initialHasMore: boolean;
  sitemapUrl: string;
}

interface EntryCardProps {
  entry: SitemapEntry;
  isLiked: boolean;
  onLikeToggle: (url: string) => Promise<void>;
  isPending: boolean;
}

const EntryCard = memo(function EntryCard({ entry, isLiked, onLikeToggle, isPending }: EntryCardProps) {
  const handleLike = async () => {
    await onLikeToggle(entry.url);
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex gap-4">
        {entry.meta.image && (
          <div className="relative h-24 w-24 flex-shrink-0">
            <Image
              src={entry.meta.image}
              alt={entry.meta.title}
              fill
              className="rounded-md object-cover"
            />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-medium line-clamp-2 mb-1">
            {entry.meta.title || new URL(entry.url).pathname.split('/').pop()}
          </h3>
          {entry.meta.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {entry.meta.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-muted-foreground">
            {entry.lastmod && (
              <span className="text-xs">
                {new Date(entry.lastmod).toLocaleDateString()}
              </span>
            )}
            <Button 
              onClick={handleLike}
              variant="ghost"
              size="icon"
              disabled={isPending}
              aria-disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
              )}
            </Button>
            <button className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary ml-3">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">0</span>
            </button>
            <button className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary ml-3">
              <Share className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
});

export function SitemapMetaPreview({ 
  initialEntries, 
  initialLikedUrls,
  initialHasMore,
  sitemapUrl 
}: MetaPreviewProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [entries, setEntries] = useState<SitemapEntry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    new Set(initialLikedUrls.map(normalizeUrl)),
    (state: Set<string>, update: string) => {
      const newState = new Set(state);
      if (newState.has(update)) {
        newState.delete(update);
      } else {
        newState.add(update);
      }
      return newState;
    }
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  const { ref: loaderRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px 0px',
    triggerOnce: false,
    delay: 100
  });

  // Real-time subscription using Supabase
  useEffect(() => {
    const channel = supabase.channel('meta-likes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meta_likes'
      }, async () => {
        startTransition(async () => {
          const response = await fetch('/api/meta-like');
          if (response.ok) {
            const { likes } = await response.json() as { likes: string[] };
            // Update each URL individually
            likes.forEach(url => {
              addOptimisticLike(normalizeUrl(url));
            });
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleToggleLike = useCallback(async (rawUrl: string) => {
    const metaUrl = normalizeUrl(rawUrl);
    
    try {
      startTransition(async () => {
        // Optimistic update
        addOptimisticLike(metaUrl);
        
        const { success, error } = await toggleMetaLike(metaUrl);
        if (!success) {
          throw new Error(error || 'Failed to toggle like');
        }
      });
    } catch (error) {
      toast({
        title: "Error updating like",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  }, [toast]);

  const loadMoreEntries = useCallback(async () => {
    if (loadingRef.current || !sitemapUrl) return;

    const nextPage = page + 1;
    setIsLoading(true);
    loadingRef.current = true;

    try {
      const response = await fetch(
        `/api/sitemap-entries?url=${encodeURIComponent(sitemapUrl)}&page=${nextPage}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch more entries');
      
      const data = await response.json();
      
      if (data.entries?.length) {
        setEntries(prev => {
          // Merge entries while preventing duplicates
          const urlSet = new Set(prev.map(e => e.url));
          const newEntries = data.entries.filter(
            (entry: SitemapEntry) => !urlSet.has(entry.url)
          );
          
          return [...prev, ...newEntries];
        });
        setPage(nextPage);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Load more failed:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [page, sitemapUrl]);

  useEffect(() => {
    if (inView && !loadingRef.current && hasMore) {
      loadMoreEntries();
    }
  }, [inView, loadMoreEntries, hasMore]);

  // Reset state when sitemapUrl changes
  useEffect(() => {
    setEntries(initialEntries);
    setPage(1);
    setHasMore(initialHasMore);
  }, [sitemapUrl, initialEntries, initialHasMore]);

  return (
    <ScrollArea 
      className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
      type="always"
    >
      <div className="space-y-4">
        {entries.map((entry) => {
          const normalizedUrl = normalizeUrl(entry.url);
          return (
            <EntryCard
              key={normalizedUrl}
              entry={entry}
              isLiked={optimisticLikes.has(normalizedUrl)}
              onLikeToggle={handleToggleLike}
              isPending={isPending}
            />
          );
        })}
        
        {hasMore && (
          <div ref={loaderRef} className="h-20 flex items-center justify-center">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Scroll for more entries... (Page {page})
              </p>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
} 