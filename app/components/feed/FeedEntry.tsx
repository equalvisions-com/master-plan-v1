'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
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
  }
  isLiked: boolean
  onLikeToggle: (url: string) => Promise<void>
  onCommentToggle: (url: string) => void
  userId?: string | null
  post?: {
    title: string
    featuredImage?: {
      node: {
        sourceUrl: string
      }
    }
  }
}

export function FeedEntry({
  entry,
  isLiked,
  onLikeToggle,
  onCommentToggle,
  userId,
  post
}: FeedEntryProps) {
  const [isCardClicked, setIsCardClicked] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const formattedDate = new Date(entry.lastmod).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  // Handle global click events
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsCardClicked(prev => !prev)
  }

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
                    e.stopPropagation()
                    if (e.target === e.currentTarget) {
                      setIsCardClicked(false)
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
                      e.preventDefault()
                      e.stopPropagation()
                      window.open(entry.url, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    {post?.featuredImage?.node?.sourceUrl && (
                      <Image
                        src={post.featuredImage.node.sourceUrl}
                        alt={post.title || 'Post thumbnail'}
                        width={16}
                        height={16}
                        className="rounded-sm"
                      />
                    )}
                    {`Read on ${post?.title || 'Article'}`}
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
                onClick={(e) => {
                  e.stopPropagation()
                  userId && onLikeToggle(entry.url)
                }}
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
                onClick={(e) => {
                  e.stopPropagation()
                  onCommentToggle(entry.url)
                }}
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
    </div>
  )
} 