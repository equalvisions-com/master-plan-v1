'use client'

import { useState, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import useSWRInfinite from 'swr/infinite'
import { Card } from '@/app/components/ui/card'
import { Heart, MessageCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { toggleMetaLike } from '@/app/actions/meta-like'
import { useToast } from '@/components/ui/use-toast'

interface FeedEntry {
  url: string
  meta: {
    title: string
    description: string
    image: string
  }
  lastmod: string
  commentCount: number
  likeCount: number
}

interface FeedProps {
  userId: string
  initialEntries: FeedEntry[]
  initialLikedUrls: string[]
  initialTotal: number
  initialNextCursor: string | null
}

interface FeedPageData {
  entries: FeedEntry[]
  nextCursor: string | null
  total: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json() as Promise<FeedPageData>
}

function FeedCard({ entry, isLiked, onLikeToggle, userId }: {
  entry: FeedEntry
  isLiked: boolean
  onLikeToggle: (url: string) => Promise<void>
  userId: string
}) {
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [likeCount, setLikeCount] = useState(entry.likeCount)

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!userId || isLikeLoading) return
    
    setIsLikeLoading(true)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
    
    await onLikeToggle(entry.url)
    setIsLikeLoading(false)
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
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        
        <div className="p-4">
          <h3 className="font-semibold line-clamp-2 mb-1">
            {entry.meta.title}
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

            <time className="ml-auto text-xs">
              {new Date(entry.lastmod).toLocaleDateString()}
            </time>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function Feed({
  userId,
  initialEntries,
  initialLikedUrls,
  initialTotal,
  initialNextCursor
}: FeedProps) {
  const { toast } = useToast()
  const [likedUrls, setLikedUrls] = useState<Set<string>>(
    new Set(initialLikedUrls.map(normalizeUrl))
  )

  const getKey = (pageIndex: number, previousPageData: FeedPageData | null) => {
    if (previousPageData && !previousPageData.entries) return null
    if (pageIndex === 0) return null // First page is handled by initial props
    
    const cursor = pageIndex === 1 
      ? initialNextCursor 
      : previousPageData?.nextCursor

    if (!cursor) return null
    
    return `/api/feed?cursor=${cursor}`
  }

  const {
    data: pages,
    size,
    setSize,
    isValidating
  } = useSWRInfinite(getKey, fetcher, {
    fallbackData: [{
      entries: initialEntries,
      nextCursor: initialNextCursor,
      total: initialTotal
    }],
    revalidateFirstPage: false
  })

  const { ref } = useInView({
    onChange: (inView) => {
      if (inView && !isValidating) {
        setSize(size + 1)
      }
    }
  })

  const toggleLike = useCallback(async (url: string) => {
    try {
      const metaUrl = normalizeUrl(url)
      const wasLiked = likedUrls.has(metaUrl)
      
      setLikedUrls(prev => {
        const next = new Set(prev)
        if (wasLiked) {
          next.delete(metaUrl)
        } else {
          next.add(metaUrl)
        }
        return next
      })

      const { success, error } = await toggleMetaLike(metaUrl)
      
      if (!success) {
        throw new Error(error || 'Failed to toggle like')
      }
    } catch (error) {
      toast({
        title: "Error updating like",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    }
  }, [likedUrls, toast])

  const entries = pages?.flatMap(page => page.entries) || initialEntries
  const hasMore = pages?.[pages.length - 1]?.nextCursor

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {entries.map((entry) => (
        <FeedCard
          key={entry.url}
          entry={entry}
          isLiked={likedUrls.has(normalizeUrl(entry.url))}
          onLikeToggle={toggleLike}
          userId={userId}
        />
      ))}
      
      {hasMore && (
        <div ref={ref} className="col-span-full h-20 flex items-center justify-center">
          {isValidating && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  )
} 