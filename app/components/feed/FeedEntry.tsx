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
    post?: {
      title: string
      featuredImage?: {
        node: {
          sourceUrl: string
          altText: string
        }
      }
      slug: string
    }
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
          <Link href={entry.url} className="relative w-full pt-[56.25%]">
            <Image
              src={entry.meta.image}
              alt={entry.meta.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
          </Link>
        )}
        
        <div className="flex-1 p-4">
          <Link href={entry.url} className="block hover:text-primary transition-colors">
            <h3 className="font-semibold line-clamp-2 mb-1">
              {entry.meta.title}
            </h3>
          </Link>
          
          {entry.post && (
            <div className="flex items-center gap-3 mt-2 mb-3">
              {entry.post.featuredImage?.node.sourceUrl && (
                <div className="relative h-6 w-6 flex-shrink-0">
                  <Image
                    src={entry.post.featuredImage.node.sourceUrl}
                    alt={entry.post.featuredImage.node.altText || entry.post.title}
                    className="rounded-full object-cover"
                    fill
                    sizes="24px"
                    priority={false}
                  />
                </div>
              )}
              <Link 
                href={`/${entry.post.slug}`}
                className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
              >
                {entry.post.title}
              </Link>
            </div>
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