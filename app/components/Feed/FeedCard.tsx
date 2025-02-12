'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card } from "@/app/components/ui/card"
import { Heart, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleMetaLike } from '@/app/actions/meta-like'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import type { FeedEntry } from './Server'

interface FeedCardProps {
  entry: FeedEntry
  isLiked: boolean
  userId?: string
  onLikeToggle: (url: string) => void
}

export function FeedCard({ entry, isLiked, userId, onLikeToggle }: FeedCardProps) {
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [likeCount, setLikeCount] = useState(entry.likeCount)

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!userId || isLikeLoading) return
    
    setIsLikeLoading(true)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
    
    try {
      await toggleMetaLike(normalizeUrl(entry.url))
      onLikeToggle(entry.url)
    } catch (error) {
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
    } finally {
      setIsLikeLoading(false)
    }
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow overflow-hidden">
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
                userId ? "hover:text-primary" : "cursor-not-allowed"
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isLiked ? "fill-current text-red-500" : ""
                )}
              />
              <span className="text-xs">{likeCount}</span>
            </button>
            
            <div className="inline-flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{entry.commentCount}</span>
            </div>

            {entry.lastmod && (
              <time dateTime={entry.lastmod} className="ml-auto text-xs">
                {new Date(entry.lastmod).toLocaleDateString()}
              </time>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
} 