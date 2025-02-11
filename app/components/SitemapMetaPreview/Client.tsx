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
import { PlatformIcon } from '@/app/lib/utils/platformMap';
import useSWRInfinite, { SWRInfiniteResponse } from 'swr/infinite';

// Global SWR configuration
const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  dedupingInterval: 2000, // 2 seconds
};

interface MetaPreviewProps {
  initialEntries: SitemapEntry[];
  initialLikedUrls: string[];
  initialHasMore: boolean;
  initialTotal: number;
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

// Add proper types for the API response and page data
interface SitemapApiResponse {
  entries: SitemapEntry[];
  hasMore: boolean;
  total: number;
}

interface PageData {
  entries: SitemapEntry[];
  hasMore: boolean;
  total: number;
}

// Add a custom fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// Optimize EntryCard with better image loading
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

  // Memoize platform information
  const platformInfo = useMemo(() => {
    if (!entry.meta.platform) return null;
    return {
      platform: entry.meta.platform,
      label: `Read on ${entry.meta.platform}`
    };
  }, [entry.meta.platform]);

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
          !(e.target as Element).closest('button')?.getAttribute('aria-label')?.includes('comment')) {
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

  // Optimize image loading with proper types
  const imageProps = entry.meta.image ? {
    src: entry.meta.image,
    alt: entry.meta.title || 'Entry image',
    fill: true,
    sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    priority: false,
    className: "object-cover absolute inset-0",
    quality: 85,
    onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      e.currentTarget.style.display = 'none';
    }
  } : null;

  return (
    <div 
      ref={cardRef}
      onClick={handleCardClick}
      className="relative"
    >
      <Card className="group relative hover:shadow-lg transition-shadow overflow-hidden cursor-pointer">
        <div className="flex flex-col">
          {imageProps && (
            <div className="relative w-full pt-[56.25%]">
              <Image 
                {...imageProps} 
                alt={entry.meta.title || 'Entry thumbnail'} 
              />
              {isCardClicked && (
                <div 
                  className="absolute inset-0 bg-black/50 flex items-center justify-center transition-all duration-200"
                  role="dialog"
                  aria-label="Read article overlay"
                  data-overlay-background="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.target === e.currentTarget) {
                      setIsCardClicked(false);
                    }
                  }}
                >
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-black px-6 py-2 rounded-md font-medium hover:bg-gray-100 transition-all no-underline inline-flex items-center gap-2 text-sm border border-gray-300 shadow-[0_1px_0_rgba(27,31,36,0.04)] hover:shadow-inner active:shadow-inner active:bg-gray-200"
                    aria-label={`Read ${entry.meta.title || 'article'}${platformInfo ? ` on ${platformInfo.platform}` : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(entry.url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {platformInfo && (
                      <PlatformIcon platform={platformInfo.platform} className="h-4 w-4" />
                    )}
                    {platformInfo ? platformInfo.label : 'Read'}
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
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

// Main component with SWR integration
export function SitemapMetaPreview({ 
  initialEntries, 
  initialLikedUrls,
  initialHasMore,
  initialTotal,
  sitemapUrl,
  userId
}: MetaPreviewProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [likedUrls, setLikedUrls] = useState<Set<string>>(
    new Set(initialLikedUrls.map(normalizeUrl))
  );
  const [expandedCommentUrl, setExpandedCommentUrl] = useState<string | null>(null);

  // Use SWR for infinite loading with proper types
  const getKey = (pageIndex: number, previousPageData: SitemapApiResponse | null) => {
    if (previousPageData && !previousPageData.entries?.length) return null;
    return `/api/sitemap-entries?url=${encodeURIComponent(sitemapUrl)}&page=${pageIndex + 1}`;
  };

  const {
    data: pagesData,
    size,
    setSize,
    isValidating,
    error
  }: SWRInfiniteResponse<SitemapApiResponse> = useSWRInfinite<SitemapApiResponse>(getKey, fetcher, {
    ...SWR_CONFIG,
    fallbackData: [{ entries: initialEntries, hasMore: initialHasMore, total: initialTotal }],
    revalidateFirstPage: false,
    persistSize: true,
  });

  // Flatten and deduplicate entries with proper types
  const entries = useMemo(() => {
    if (!pagesData) return initialEntries;
    const urlSet = new Set<string>();
    
    // Define a more specific type for our filtered entries
    type ValidEntry = SitemapEntry & { url: string };
    
    // Get platform from first entry if it exists
    const platform = initialEntries[0]?.meta?.platform;
    
    return pagesData
      .flatMap((page: PageData) => page.entries)
      .filter((entry: SitemapEntry): entry is ValidEntry => {
        if (!entry.url || typeof entry.url !== 'string') return false;
        if (urlSet.has(entry.url)) return false;
        urlSet.add(entry.url);
        return true;
      })
      .map(entry => ({
        ...entry,
        meta: {
          ...entry.meta,
          platform: entry.meta.platform || platform // Preserve platform information
        }
      }));
  }, [pagesData, initialEntries]);

  const hasMore = pagesData?.[pagesData.length - 1]?.hasMore ?? false;

  // Optimized intersection observer
  const { ref: loaderRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px 0px',
    triggerOnce: false,
  });

  // Load more entries when scrolling
  useEffect(() => {
    if (inView && hasMore && !isValidating) {
      setSize(size + 1);
    }
  }, [inView, hasMore, isValidating, setSize, size]);

  // Supabase real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('meta-likes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meta_likes',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<MetaLike>) => {
          if (!payload.new && !payload.old) return;
          
          setLikedUrls(prev => {
            const next = new Set(prev);
            if (payload.eventType === 'INSERT' && payload.new) {
              next.add(normalizeUrl(payload.new.meta_url));
            } else if (payload.eventType === 'DELETE' && payload.old) {
              next.delete(normalizeUrl(payload.old.meta_url));
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  // Optimized like toggle with error handling
  const toggleLike = useCallback(async (rawUrl: string) => {
    if (!userId) {
      window.location.href = '/login';
      return;
    }

    if (!rawUrl) return;

    const metaUrl = normalizeUrl(rawUrl);
    const prevLiked = likedUrls.has(metaUrl);
    
    try {
      setLikedUrls(prev => {
        const next = new Set(prev);
        if (prevLiked) {
          next.delete(metaUrl);
        } else {
          next.add(metaUrl);
        }
        return next;
      });
      
      const { success, liked, error } = await toggleMetaLike(metaUrl);
      
      if (!success || typeof liked !== 'boolean') {
        throw new Error(error || 'Failed to toggle like');
      }
    } catch (error) {
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

  const handleCommentsToggle = useCallback((url: string) => {
    setExpandedCommentUrl(prev => prev === url ? null : url);
  }, []);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Error loading entries. Please try refreshing.</p>
      </div>
    );
  }

  return (
    <ScrollArea 
      className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] -mr-4 md:-mr-8" 
      type="always"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 md:pb-8">
        {(entries as (SitemapEntry & { url: string })[]).map((entry) => {
          const normalizedUrl = normalizeUrl(entry.url);
          const platform = entry.meta.platform;
          
          return (
            <EntryCard
              key={entry.url}
              entry={{
                ...entry,
                meta: {
                  ...entry.meta,
                  platform // Ensure platform is passed down
                }
              }}
              isLiked={likedUrls.has(normalizedUrl)}
              onLikeToggle={toggleLike}
              userId={userId}
              isCommentsExpanded={expandedCommentUrl === entry.url}
              onCommentsToggle={handleCommentsToggle}
            />
          );
        })}
        
        {hasMore && (
          <div ref={loaderRef} className="col-span-full h-20 flex items-center justify-center">
            {isValidating && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </div>
        )}
      </div>
    </ScrollArea>
  );
} 