'use client'

import Image from 'next/image'
import { Heart, MessageCircle, Share, Loader2 } from 'lucide-react'
import { Card } from '@/app/components/ui/card'
import { cn } from '@/lib/utils'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Comments } from '@/app/components/Comments/Comments'

interface FeedEntryProps {
  entry: {
    url: string
    meta: {
      title: string
      description: string
      image?: string
    }
    lastmod: string
    sourceKey: string
    commentCount: number
    likeCount: number
  }
  isLiked: boolean
  onLikeToggle: (url: string) => Promise<void>
  onCommentToggle: (url: string) => void
  userId?: string | null
  sitemap: {
    title: string
    featured_image?: string
  }
  isCommentsExpanded?: boolean
}

export function FeedEntry({
  entry,
  isLiked,
  onLikeToggle,
  onCommentToggle,
  userId,
  sitemap,
  isCommentsExpanded = false
}: FeedEntryProps) {
  const [isCardClicked, setIsCardClicked] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentCount, setCommentCount] = useState(entry.commentCount || 0)
  const [likeCount, setLikeCount] = useState(entry.likeCount || 0)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isLikeCooldown, setIsLikeCooldown] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const commentsRef = useRef<HTMLDivElement>(null)

  // Update counts when entry props change
  useEffect(() => {
    setCommentCount(entry.commentCount || 0)
    setLikeCount(entry.likeCount || 0)
  }, [entry.commentCount, entry.likeCount])

  // Handle global click handler
  const handleGlobalClick = useCallback((e: MouseEvent) => {
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

  // Add event listener with cleanup
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
        onCommentToggle(entry.url);
      }
    };

    if (isCommentsExpanded) {
      document.addEventListener('mousedown', handleDocumentClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isCommentsExpanded, entry.url, onCommentToggle]);

  const handleCommentAdded = useCallback(() => {
    setCommentCount(prev => prev + 1);
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId || isLikeLoading || isLikeCooldown) return;
    
    setIsLikeLoading(true);
    // Optimistically update the like count
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    try {
      await onLikeToggle(entry.url);
      // Set a cooldown period of 1 second
      setIsLikeCooldown(true);
      setTimeout(() => {
        setIsLikeCooldown(false);
      }, 1000);
    } catch (error) {
      // Revert the optimistic update if there's an error
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const formattedDate = new Date(entry.lastmod).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  return (
    <div 
      ref={cardRef}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        setIsCardClicked(true);
      }}
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
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                    className="bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-all no-underline inline-flex items-center gap-2 text-sm border border-gray-300 shadow-[0_1px_0_rgba(27,31,36,0.04)] hover:shadow-inner active:shadow-inner active:bg-gray-200"
                    aria-label={`Read ${entry.meta.title || 'article'}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(entry.url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {sitemap.featured_image && (
                      <Image
                        src={sitemap.featured_image}
                        alt={sitemap.title || 'Sitemap thumbnail'}
                        width={16}
                        height={16}
                        className="rounded-sm"
                      />
                    )}
                    {`Read on ${sitemap.title || 'Article'}`}
                  </a>
                </div>
              )}
            </div>
          )}
          
          <div className="flex-1 p-4">
            <h3 className="font-semibold line-clamp-2 mb-1">
              {entry.meta.title}
            </h3>
            {entry.meta.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {entry.meta.description}
              </p>
            )}
            
            <div className="mt-4 flex items-center gap-4 text-muted-foreground">
              <button
                onClick={handleLike}
                disabled={!userId || isLikeLoading || isLikeCooldown}
                className={cn(
                  "inline-flex items-center gap-1",
                  userId ? "hover:text-primary" : "cursor-not-allowed",
                  (isLikeLoading || isLikeCooldown) && "opacity-50"
                )}
                aria-label={isLiked ? "Unlike" : "Like"}
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isLiked ? "fill-current text-red-500" : ""
                  )}
                />
                <span className="text-xs">{likeCount}</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCommentToggle(entry.url);
                }}
                className="inline-flex items-center gap-1 hover:text-primary"
                aria-label="Toggle comments"
                aria-expanded={isCommentsExpanded}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{commentCount}</span>
              </button>
              
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <Share className="h-4 w-4" />
              </button>
              
              <time dateTime={entry.lastmod} className="ml-auto text-xs">
                {formattedDate}
              </time>
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
  )
} 