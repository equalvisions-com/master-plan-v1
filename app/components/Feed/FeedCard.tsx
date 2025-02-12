'use client';

import Image from 'next/image';
import { Heart, Share, MessageCircle } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { cn } from "@/lib/utils";
import { useState, useCallback } from 'react';
import type { SitemapEntry } from '@/app/lib/sitemap/types';

interface FeedCardProps {
  entry: SitemapEntry & {
    commentCount: number;
    likeCount: number;
  };
  isLiked: boolean;
  onLikeToggle: (url: string) => Promise<void>;
  onCommentToggle: () => void;
  userId?: string | null;
}

export function FeedCard({
  entry,
  isLiked,
  onLikeToggle,
  onCommentToggle,
  userId
}: FeedCardProps) {
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(entry.likeCount);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId || isLikeLoading) return;

    setIsLikeLoading(true);
    setLocalLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    try {
      await onLikeToggle(entry.url);
    } catch {
      setLocalLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    } finally {
      setIsLikeLoading(false);
    }
  }, [entry.url, isLiked, onLikeToggle, userId, isLikeLoading]);

  const formattedDate = entry.lastmod ? new Date(entry.lastmod).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : null;

  return (
    <Card className="group relative hover:shadow-lg transition-shadow overflow-hidden cursor-pointer">
      <div className="flex flex-col">
        {entry.meta.image && (
          <div className="relative w-full pt-[56.25%]">
            <Image
              src={entry.meta.image}
              alt={entry.meta.title || 'Entry thumbnail'}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              priority={false}
            />
          </div>
        )}
        
        <div className="flex-1 p-4">
          <h3 className="font-semibold line-clamp-2 mb-1">
            {entry.meta.title || new URL(entry.url).pathname.split('/').pop()}
          </h3>
          {entry.meta.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {entry.meta.description}
            </p>
          )}
          
          <div className="mt-2 flex items-center gap-4 text-muted-foreground">
            <button
              onClick={handleLike}
              disabled={isLikeLoading}
              className={cn(
                "inline-flex items-center gap-1",
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
              <span className="text-xs">{localLikeCount}</span>
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCommentToggle();
              }}
              className="inline-flex items-center gap-1 hover:text-primary"
              aria-label="Toggle comments"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{entry.commentCount}</span>
            </button>
            
            <button
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 hover:text-primary"
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
      </div>
    </Card>
  );
} 