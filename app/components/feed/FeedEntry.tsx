'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Share } from 'lucide-react'
import { Card } from '@/app/components/ui/card'
import { cn } from '@/lib/utils'

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
    postTitle?: string
    postImage?: string
  }
  isLiked: boolean
  onLikeToggle: (url: string) => Promise<void>
  onCommentToggle: (url: string) => void
  userId?: string | null
}

export function FeedEntry({
  entry,
  isLiked,
  onLikeToggle,
  onCommentToggle,
  userId
}: FeedEntryProps) {
  const formattedDate = new Date(entry.lastmod).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  return (
    <Card className="group relative hover:shadow-lg transition-shadow overflow-hidden">
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
          </div>
        )}
        
        <div className="flex-1 p-4">
          <h3 className="font-semibold line-clamp-2 mb-1">
            {entry.meta.title}
          </h3>
          {(entry.postTitle || entry.postImage) && (
            <Link 
              href={entry.url} 
              className="flex items-center gap-2 mb-2 group/post hover:text-primary transition-colors"
            >
              {entry.postImage && (
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border">
                  <Image
                    src={entry.postImage}
                    alt={entry.postTitle || 'Post image'}
                    fill
                    className="object-cover group-hover/post:scale-105 transition-transform"
                    sizes="32px"
                    priority={false}
                  />
                </div>
              )}
              {entry.postTitle && (
                <span className="text-sm font-medium line-clamp-1">
                  {entry.postTitle}
                </span>
              )}
            </Link>
          )}
          {entry.meta.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {entry.meta.description}
            </p>
          )}
          
          <div className="mt-4 flex items-center gap-4 text-muted-foreground">
            <button
              onClick={() => userId && onLikeToggle(entry.url)}
              className={cn(
                "inline-flex items-center gap-1",
                userId ? "hover:text-primary" : "cursor-not-allowed"
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isLiked ? "fill-current text-red-500" : ""
                )}
              />
              <span className="text-xs">{entry.likeCount}</span>
            </button>
            
            <button
              onClick={() => onCommentToggle(entry.url)}
              className="inline-flex items-center gap-1 hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{entry.commentCount}</span>
            </button>
            
            <button className="inline-flex items-center gap-1 hover:text-primary">
              <Share className="h-4 w-4" />
            </button>
            
            <time dateTime={entry.lastmod} className="ml-auto text-xs">
              {formattedDate}
            </time>
          </div>
        </div>
      </div>
    </Card>
  )
} 