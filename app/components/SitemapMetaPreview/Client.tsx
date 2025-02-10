'use client';

import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import Image from 'next/image';
import type { SitemapEntry } from '@/app/lib/sitemap/types';
import { Card } from "@/app/components/ui/card";
import { Heart, Share, MessageCircle, Loader2 } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInView } from 'react-intersection-observer';
import { useToast } from "@/components/ui/use-toast";
import { toggleMetaLike } from '@/app/actions/meta-like'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { cn } from '@/lib/utils';
import { Comments } from '@/app/components/Comments/Comments'

interface MetaPreviewProps {
  initialEntries: SitemapEntry[];
  initialLikedUrls: string[];
  initialHasMore: boolean;
  sitemapUrl: string;
  userId?: string | null;
}

interface EntryCardProps {
  entry: SitemapEntry;
  isLiked: boolean;
  onLikeToggle: (url: string) => Promise<void>;
  userId?: string | null;
  isCommentsExpanded: boolean;
  onCommentsToggle: (url: string) => void;
}

// Add type for meta_likes table
interface MetaLike {
  id: string
  user_id: string
  meta_url: string
  created_at: string
}

const EntryCard = memo(function EntryCard({ 
  entry, 
  isLiked, 
  onLikeToggle, 
  userId,
  isCommentsExpanded,
  onCommentsToggle 
}: EntryCardProps) {
  const [commentCount, setCommentCount] = useState(entry.commentCount || 0)
  const [likeCount, setLikeCount] = useState(entry.likeCount || 0)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isLikeCooldown, setIsLikeCooldown] = useState(false)
  const [isCardClicked, setIsCardClicked] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const commentsRef = useRef<HTMLDivElement>(null)

  // Optimize global click handler with useCallback
  const handleGlobalClick = useCallback((e: MouseEvent) => {
    // If clicking inside the card, let the card handler manage it
    if (cardRef.current?.contains(e.target as Node)) {
      // If clicking inside comments section or read button, don't close the card overlay
      if (commentsRef.current?.contains(e.target as Node) || 
          (e.target as Element).closest('a')?.getAttribute('aria-label')?.includes('Read') ||
          (e.target as Element).closest('button')?.getAttribute('aria-label')?.includes('comment')) {
        return;
      }
      // Only close if clicking the overlay background
      if ((e.target as Element).getAttribute('data-overlay-background') === 'true') {
        setIsCardClicked(false);
      }
      return;
    }
    // If clicking outside and overlay is shown, hide it
    if (isCardClicked) {
      setIsCardClicked(false);
    }
  }, [isCardClicked]);

  // Optimize event listener with proper cleanup
  useEffect(() => {
    document.addEventListener('mousedown', handleGlobalClick);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [handleGlobalClick]);

  // Add document-level click handler for comments
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (isCommentsExpanded && 
          !commentsRef.current?.contains(e.target as Node) &&
          !(e.target as Element).closest('button')?.getAttribute('aria-label')?.includes('comment')
      ) {
        onCommentsToggle(entry.url);
      }
    };

    if (isCommentsExpanded) {
      document.addEventListener('mousedown', handleDocumentClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isCommentsExpanded, entry.url, onCommentsToggle]);

  // Optimize card click handler with useCallback
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCardClicked(prev => !prev);
  }, []);

  // Optimize comment toggle with useCallback
  const handleCommentToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCommentsToggle(entry.url);
  }, [entry.url, onCommentsToggle]);

  // Optimize share click handler
  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Only update comment count when new comments are added
  const handleCommentAdded = useCallback(() => {
    setCommentCount(prev => prev + 1);
  }, []);

  // Update like count when like status changes with rate limiting
  const handleLike = useCallback(async () => {
    if (!userId) {
      window.location.href = '/login';
      return;
    }

    if (isLikeLoading || isLikeCooldown) {
      return;
    }

    setIsLikeLoading(true);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    await onLikeToggle(entry.url);
    setIsLikeLoading(false);

    // Set a cooldown period of 1 second
    setIsLikeCooldown(true);
    setTimeout(() => {
      setIsLikeCooldown(false);
    }, 1000);
  }, [entry.url, isLiked, onLikeToggle, userId, isLikeLoading, isLikeCooldown]);

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
    <div 
      ref={cardRef}
      onClick={handleCardClick}
      className="relative"
    >
      <Card className="group relative hover:shadow-lg transition-shadow overflow-hidden cursor-pointer">
        <div className="flex flex-col">
          {entry.meta.image && (
            <div className="relative w-full pt-[56.25%]">
              <Image
                src={entry.meta.image}
                alt={entry.meta.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={false}
                className="object-cover absolute inset-0"
                quality={85}
                loading="lazy"
              />
              {isCardClicked && (
                <div 
                  className="absolute inset-0 bg-black/50 flex items-center justify-center transition-all duration-200"
                  role="dialog"
                  aria-label="Read article overlay"
                  data-overlay-background="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Only close if clicking the overlay background directly
                    if (e.target === e.currentTarget) {
                      setIsCardClicked(false);
                    }
                  }}
                >
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-black px-6 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors shadow-lg no-underline inline-flex items-center gap-2"
                    aria-label={`Read ${entry.meta.title || 'article'}${entry.meta.platform ? ` on ${entry.meta.platform}` : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(entry.url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Read{entry.meta.platform ? ` on ${entry.meta.platform}` : ''}
                  </a>
                </div>
              )}
            </div>
          )}
          <div className="flex-1 p-4">
            <div className="relative">
              <h3 className="font-semibold line-clamp-2 mb-1">
                {entry.meta.title || new URL(entry.url).pathname.split('/').pop()}
              </h3>
              {entry.meta.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-[1.25rem] md:min-h-[2.5rem]">
                  {entry.meta.description}
                </p>
              )}
            </div>
            <div className="mt-2 flex items-center gap-4 text-muted-foreground relative">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLike();
                }}
                disabled={isLikeLoading || isLikeCooldown}
                className={cn(
                  "inline-flex items-center gap-1 relative z-10",
                  userId ? "hover:text-primary" : "cursor-pointer"
                )}
                aria-label={isLiked ? "Unlike" : "Like"}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4",
                    isLiked ? "fill-current text-red-500" : "text-muted-foreground"
                  )} 
                />
                <span className="text-xs">{likeCount}</span>
              </button>
              <button 
                onClick={handleCommentToggle}
                className="inline-flex items-center gap-1 hover:text-primary relative z-10"
                aria-label="Toggle comments"
                aria-expanded={isCommentsExpanded}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{commentCount}</span>
              </button>
              <button 
                onClick={handleShareClick}
                className="inline-flex items-center gap-1 hover:text-primary relative z-10"
                aria-label="Share"
              >
                <Share className="h-4 w-4" />
              </button>
              {formattedDate && (
                <time dateTime={entry.lastmod} className="ml-auto text-xs">
                  {formattedDate}
                </time>
              )}
            </div>
          </div>

          <div 
            className={cn(
              "grid transition-all duration-300 ease-in-out relative z-10",
              isCommentsExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
            ref={commentsRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="overflow-hidden">
              <div className="relative border-t border-border px-4 pt-4 pb-4">
                <Comments 
                  url={entry.url}
                  isExpanded={isCommentsExpanded}
                  onCommentAdded={handleCommentAdded}
                  onLoadingChange={setIsLoadingComments}
                  userId={userId}
                />
                {isLoadingComments && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-background/80"
                    role="status"
                    aria-label="Loading comments"
                  >
                    <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export function SitemapMetaPreview({ 
  initialEntries, 
  initialLikedUrls,
  initialHasMore,
  sitemapUrl,
  userId 
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
  const [expandedCommentUrl, setExpandedCommentUrl] = useState<string | null>(null);

  // Memoize entries to prevent unnecessary re-renders
  const memoizedEntries = useMemo(() => entries.map(entry => ({
    ...entry,
    normalizedUrl: normalizeUrl(entry.url)
  })), [entries]);

  // Subscribe to all meta_likes changes, not just the current user's
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
          async (payload: RealtimePostgresChangesPayload<MetaLike>) => {
            if (payload.eventType === 'INSERT' && payload.new && 'meta_url' in payload.new) {
              setLikedUrls(prev => new Set([...prev, normalizeUrl(payload.new.meta_url as string)]));
            } else if (payload.eventType === 'DELETE' && payload.old && 'meta_url' in payload.old) {
              setLikedUrls(prev => {
                const next = new Set(prev);
                next.delete(normalizeUrl(payload.old.meta_url as string));
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
    // Don't proceed if user is not logged in
    if (!userId) {
      window.location.href = '/login';
      return;
    }

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
  }, [likedUrls, toast, userId]);

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

  const handleCommentsToggle = useCallback((url: string) => {
    setExpandedCommentUrl(prev => prev === url ? null : url);
  }, []);

  return (
    <ScrollArea 
      className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] -mr-4 md:-mr-8" 
      type="always"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 md:pb-8">
        {memoizedEntries.map(({ normalizedUrl, ...entry }) => (
          <EntryCard
            key={normalizedUrl}
            entry={entry}
            isLiked={likedUrls.has(normalizedUrl)}
            onLikeToggle={toggleLike}
            userId={userId}
            isCommentsExpanded={expandedCommentUrl === entry.url}
            onCommentsToggle={handleCommentsToggle}
          />
        ))}
        
        {hasMore && (
          <div ref={loaderRef} className="col-span-full h-20 flex items-center justify-center">
            {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
          </div>
        )}
      </div>
    </ScrollArea>
  );
} 