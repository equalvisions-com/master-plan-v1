'use client';

import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import Image from 'next/image';
import type { SitemapEntry } from '@/app/lib/sitemap/types';
import { Card } from "@/app/components/ui/card";
import { Heart, Share, MessageCircle, Loader2 } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInView } from 'react-intersection-observer';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { toggleMetaLike } from '@/app/actions/meta-like'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { cn } from '@/lib/utils';
import { Textarea } from "@/components/ui/textarea";
import { IoPaperPlaneOutline } from "react-icons/io5";
import { User } from '@supabase/supabase-js'

interface MetaPreviewProps {
  initialEntries: SitemapEntry[];
  initialLikedUrls: string[];
  initialHasMore: boolean;
  sitemapUrl: string;
  user: User | null;
}

interface EntryCardProps {
  entry: SitemapEntry;
  isLiked: boolean;
  onLikeToggle: (url: string) => Promise<void>;
  user: User | null;
}

interface CommentType {
  id: string
  content: string
  author: {
    name: string
    avatar: string
  }
  timestamp: string
}

const EntryCard = memo(function EntryCard({ entry, isLiked, onLikeToggle, user }: EntryCardProps) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<CommentType[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const normalizedUrl = normalizeUrl(entry.url);
  const session = user;

  const fetchComments = useCallback(async () => {
    try {
      setIsLoadingComments(true);
      const response = await fetch(`/api/comments?url=${encodeURIComponent(normalizedUrl)}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [normalizedUrl]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !session) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentInput,
          url: normalizedUrl
        })
      });

      if (!response.ok) throw new Error('Failed to post comment');
      
      const newComment = await response.json();
      setComments(prev => [newComment, ...prev]);
      setCommentInput("");
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  // Update comments when expanded
  useEffect(() => {
    if (commentsExpanded && comments.length === 0) {
      fetchComments();
    }
  }, [commentsExpanded, fetchComments, comments.length]);

  const handleLike = () => {
    onLikeToggle(entry.url);
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
              <button 
                onClick={() => setCommentsExpanded(!commentsExpanded)}
                className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{comments.length}</span>
              </button>
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
            <div className="border-t border-border pt-4 mt-4">
              <ScrollArea className="h-[200px]">
                {isLoadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-[var(--content-spacing-sm)]">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex items-start gap-[var(--content-spacing-sm)]">
                        <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                          {comment.author.avatar && (
                            <Image
                              src={comment.author.avatar}
                              alt={comment.author.name}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 space-y-[var(--content-spacing-xs)]">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {comment.author.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.timestamp).toLocaleDateString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-normal">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && !isLoadingComments && (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        No comments yet. Be the first to share your thoughts!
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
              
              <form 
                onSubmit={handleCommentSubmit} 
                className="mt-[var(--content-spacing)] relative flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Write a comment..."
                    className="resize-none overflow-hidden min-h-[40px] max-h-[40px] rounded-lg px-4 py-2 text-sm bg-muted focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 border-0 focus:border-0 focus-visible:border-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit(e);
                      }
                    }}
                  />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!commentInput.trim()}
                  className={cn(
                    "rounded-lg h-10 w-10 shrink-0 transition-colors ring-0 focus:ring-0 focus-visible:ring-0",
                    "bg-primary text-primary-foreground",
                    "disabled:bg-primary disabled:opacity-100"
                  )}
                >
                  <IoPaperPlaneOutline className="h-4 w-4" />
                </Button>
              </form>
            </div>
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
  sitemapUrl,
  user
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
  }, [supabase, user]);

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
  }, [likedUrls, toast, user]);

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
            user={user}
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