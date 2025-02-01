'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { SitemapEntry } from '@/lib/sitemap/types';
import { Card, CardContent } from "@/app/components/ui/card";
import { substackLoader } from '@/lib/image-loader';
import { Loader2, Heart, Share, MessageCircle } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInView } from 'react-intersection-observer';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface MetaPreviewProps {
  initialEntries: SitemapEntry[];
  initialHasMore: boolean;
  initialTotal: number;
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
    } catch (error) {
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
    <Card className="p-4">
      <Link 
        href={entry.url}
        className="block hover:opacity-80 md:flex md:flex-row md:gap-4"
        target="_blank"
        rel="noopener noreferrer"
      >
        {entry.meta.image && (
          <div className="w-full md:w-1/3 md:flex-shrink-0 mb-4 md:mb-0 relative h-48">
            <Image 
              src={entry.meta.image}
              alt={entry.meta.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover rounded-md"
              loading="lazy"
            />
          </div>
        )}
        <div className={`${entry.meta.image ? 'md:w-2/3' : 'w-full'} flex flex-col`}>
          <div className="flex-grow">
            <h3 className="text-lg font-semibold mb-2">{entry.meta.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{entry.meta.description}</p>
            <p className="text-xs text-gray-500">
              Last modified: {new Date(entry.lastmod).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex items-center gap-1 mt-4">
            <button 
              onClick={handleLikeClick}
              className={`inline-flex items-center space-x-1 ${
                isLiked ? 'text-red-500' : 'text-muted-foreground'
              } hover:text-red-500 transition-colors`}
              disabled={isLiking}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
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
      </Link>
    </Card>
  );
});

export function SitemapMetaPreview({ 
  initialEntries, 
  initialHasMore,
  initialTotal,
  sitemapUrl 
}: MetaPreviewProps) {
  const [entries, setEntries] = useState<SitemapEntry[]>(initialEntries);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [likedUrls, setLikedUrls] = useState<Set<string>>(new Set());
  const [isLoadingLikes, setIsLoadingLikes] = useState(true);
  const loadingRef = useRef(false);
  const { toast } = useToast();

  const { ref: loaderRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px 0px',
    triggerOnce: false,
    delay: 100
  });

  // Fetch liked URLs on mount
  useEffect(() => {
    const fetchLikedUrls = async () => {
      try {
        const response = await fetch('/api/meta-like');
        if (!response.ok) return;
        
        const data = await response.json();
        setLikedUrls(new Set(data.likes));
      } catch (error) {
        console.error('Error fetching likes:', error);
      } finally {
        setIsLoadingLikes(false);
      }
    };

    fetchLikedUrls();
  }, []);

  const handleLikeToggle = async (url: string) => {
    try {
      const response = await fetch('/api/meta-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta_url: url })
      });

      if (!response.ok) throw new Error('Failed to toggle like');
      
      const { liked } = await response.json();
      setLikedUrls(prev => {
        const next = new Set(prev);
        if (liked) {
          next.add(url);
        } else {
          next.delete(url);
        }
        return next;
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error; // Re-throw to be handled by the EntryCard
    }
  };

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
        setTotal(data.total);
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
    setTotal(initialTotal);
  }, [sitemapUrl, initialEntries, initialHasMore, initialTotal]);

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
            isLiked={likedUrls.has(entry.url)}
            onLikeToggle={handleLikeToggle}
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