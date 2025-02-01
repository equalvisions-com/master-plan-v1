'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import type { SitemapEntry } from '@/lib/sitemap/types';
import { Card } from "@/app/components/ui/card";
import { Heart, Share, MessageCircle, Loader2 } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInView } from 'react-intersection-observer';
import { useToast } from "@/components/ui/use-toast";

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
}

const EntryCard = memo(function EntryCard({ entry, isLiked, onLikeToggle }: EntryCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const { toast } = useToast();

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    if (isLiking) return;

    try {
      setIsLiking(true);
      await onLikeToggle(entry.url);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
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
            <button 
              onClick={handleLikeClick}
              className={`inline-flex items-center space-x-1 ${
                isLiked ? 'text-red-500' : 'text-muted-foreground'
              } hover:text-red-500 transition-colors`}
              disabled={isLiking}
            >
              {isLiking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              )}
            </button>
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
  const [entries, setEntries] = useState<SitemapEntry[]>(initialEntries);
  const [likedUrls, setLikedUrls] = useState<string[]>(initialLikedUrls);
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

  const toggleLike = useCallback(async (metaUrl: string) => {
    const isLiked = likedUrls.includes(metaUrl);
    try {
      const res = await fetch('/api/meta-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaUrl })
      });
      if (!res.ok) {
        throw new Error('Failed to toggle like');
      }
      await res.json();
      setLikedUrls(prev => 
        isLiked ? prev.filter(url => url !== metaUrl) : [...prev, metaUrl]
      );
    } catch (error) {
      console.error("Error toggling meta like:", error);
    }
  }, [likedUrls]);

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
      className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] -mr-8" 
      type="always"
    >
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <EntryCard 
            key={`${entry.url}-${index}`} 
            entry={entry}
            isLiked={likedUrls.includes(entry.url)}
            onLikeToggle={toggleLike}
          />
        ))}
        
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