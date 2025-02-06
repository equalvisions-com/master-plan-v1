'use client';

import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import Image from 'next/image';
import type { SitemapEntry } from '@/app/lib/sitemap/types';
import { Card } from "@/app/components/ui/card";
import { Heart, Share, Loader2 } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInView } from 'react-intersection-observer';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { toggleMetaLike } from '@/app/actions/meta-like'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { cn } from '@/lib/utils';
import { CommentsServer } from '@/app/components/Comments/Server';
import { User } from '@supabase/supabase-js';

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
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const handleLike = () => {
    onLikeToggle(entry.url);
  };

  const toggleComments = () => {
    setCommentsExpanded(prev => !prev);
  };

  // Memoize expensive computations
  const formattedDate = useMemo(() => {
    if (!entry.lastmod) return null;
    return new Date(entry.lastmod).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [entry.lastmod]);

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex flex-col gap-0">
        <div className="flex flex-col sm:flex-row gap-4">
          {entry.meta.image && (
            <div className="-mx-4 -mt-4 sm:mx-0 sm:mt-0 mb-0">
              <div className="relative w-full h-48 sm:h-24 sm:w-24 flex-shrink-0">
                <Image
                  src={entry.meta.image}
                  alt={entry.meta.title}
                  fill
                  className="object-cover rounded-t-md sm:rounded-md"
                />
              </div>
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold line-clamp-2 mb-1">
              {entry.meta.title || new URL(entry.url).pathname.split('/').pop()}
            </h3>
            {entry.meta.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {entry.meta.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-muted-foreground mt-3">
              <Button 
                onClick={handleLike}
                variant="ghost"
                size="icon"
                className={cn(
                  "hover:bg-transparent p-0 h-4 w-4",
                  isLiked && "text-red-500 hover:text-red-600"
                )}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4",
                    isLiked ? "fill-current text-red-500" : "text-muted-foreground"
                  )} 
                />
              </Button>
              <Button
                onClick={toggleComments}
                variant="ghost"
                size="icon"
                className="hover:bg-transparent p-0 h-4 w-4"
              >
                <span className="text-xs">💬</span>
              </Button>
              <button className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary">
                <Share className="h-4 w-4" />
              </button>
              {formattedDate && (
                <span className="text-xs ml-auto">
                  {formattedDate}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={`grid transition-all duration-300 ease-in-out ${
          commentsExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}>
          <div className="overflow-hidden">
            <CommentsServer url={entry.url} user={user} />
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
  const [likedUrls, setLikedUrls] = useState<Set<string>>(
    new Set(initialLikedUrls.map(normalizeUrl))
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  // Memoize entries to prevent unnecessary re-renders
  const memoizedEntries = useMemo(() => entries.map(entry => ({
    ...entry,
    normalizedUrl: normalizeUrl(entry.url)
  })), [entries]);

  // Add real-time subscription with user_id filter
  useEffect(() => {
    const getUserAndSubscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase.channel('meta-likes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meta_likes',
            filter: `user_id=eq.${user.id}` // Add filter for current user
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              setLikedUrls(prev => new Set([...prev, normalizeUrl(payload.new.meta_url)]));
            } else if (payload.eventType === 'DELETE') {
              setLikedUrls(prev => {
                const next = new Set(prev);
                next.delete(normalizeUrl(payload.old.meta_url));
                return next;
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    getUserAndSubscribe();
  }, [supabase]);

  const toggleLike = useCallback(async (rawUrl: string) => {
    const metaUrl = normalizeUrl(rawUrl);
    const prevLiked = likedUrls.has(metaUrl);
    
    try {
      // Optimistic update
      setLikedUrls(prev => new Set(prev.has(metaUrl) 
        ? [...prev].filter(url => url !== metaUrl) 
        : [...prev, metaUrl]
      ));
      
      // Server action
      const { success, liked, error } = await toggleMetaLike(metaUrl);
      
      if (!success || typeof liked !== 'boolean') {
        throw new Error(error || 'Failed to toggle like');
      }

      // Update state based on server response
      setLikedUrls(prev => {
        const next = new Set(prev);
        if (liked) {
          next.add(metaUrl);
        } else {
          next.delete(metaUrl);
        }
        return next;
      });
    } catch (error) {
      // Rollback on error
      setLikedUrls(prev => {
        const next = new Set(prev);
        if (prevLiked) {
          next.add(metaUrl);
        } else {
          next.delete(metaUrl);
        }
        return next;
      });
      
      toast({
        title: "Error updating like",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  }, [likedUrls, toast]);

  // Optimize infinite scroll with better loading state management
  const loadMoreEntries = useCallback(async () => {
    if (loadingRef.current || !sitemapUrl || !hasMore) return;

    const nextPage = page + 1;
    setIsLoading(true);
    loadingRef.current = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `/api/sitemap-entries?url=${encodeURIComponent(sitemapUrl)}&page=${nextPage}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Failed to fetch more entries');
      
      const data = await response.json();
      
      if (data.entries?.length) {
        setEntries(prev => {
          const urlSet = new Set(prev.map(e => e.url));
          const newEntries = data.entries.filter(
            (entry: SitemapEntry) => !urlSet.has(entry.url)
          );
          
          if (newEntries.length === 0) {
            setHasMore(false);
            return prev;
          }
          
          return [...prev, ...newEntries];
        });
        setPage(nextPage);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error('Error loading entries:', error.message);
          setHasMore(false);
        }
      } else {
        console.error('Unknown error loading entries');
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [page, sitemapUrl, hasMore]);

  // Optimize intersection observer with proper cleanup
  const { ref: loaderRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px 0px', // Increased for better pre-loading
    triggerOnce: false,
    delay: 0
  });

  // Debounced scroll handler
  useEffect(() => {
    if (!inView || !hasMore || loadingRef.current) return;

    const timeoutId = setTimeout(() => {
      loadMoreEntries();
    }, 100);

    return () => clearTimeout(timeoutId);
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
        {memoizedEntries.map(({ normalizedUrl, ...entry }) => (
          <EntryCard
            key={normalizedUrl}
            entry={entry}
            isLiked={likedUrls.has(normalizedUrl)}
            onLikeToggle={toggleLike}
          />
        ))}
        
        {hasMore && (
          <div ref={loaderRef} className="h-20 flex items-center justify-center">
            {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
          </div>
        )}
      </div>
    </ScrollArea>
  );
} 