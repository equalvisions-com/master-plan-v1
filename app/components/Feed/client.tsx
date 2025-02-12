'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useInView } from 'react-intersection-observer'
import { Heart, MessageCircle, Share, Loader2 } from 'lucide-react'
import { Card } from '@/app/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { toggleMetaLike } from '@/app/actions/meta-like'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { cn } from '@/lib/utils'
import type { FeedEntry } from './server'

interface FeedProps {
  initialEntries: FeedEntry[]
  initialLikedUrls: string[]
  initialCursor: string | null
  userId: string
}

interface FeedCardProps {
  entry: FeedEntry
  isLiked: boolean
  onLikeToggle: (url: string) => Promise<void>
  userId: string
}

const FeedCard = ({ entry, isLiked, onLikeToggle, userId }: FeedCardProps) => {
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [likeCount, setLikeCount] = useState(entry.likeCount)
  const [commentCount] = useState(entry.commentCount)

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
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
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              priority={false}
            />
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
              <span className="text-xs">{commentCount}</span>
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

export function Feed({
  initialEntries,
  initialLikedUrls,
  initialCursor,
  userId
}: FeedProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [cursor, setCursor] = useState(initialCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [likedUrls, setLikedUrls] = useState(
    new Set(initialLikedUrls.map(normalizeUrl))
  )
  const { toast } = useToast()
  const loadingRef = useRef(false)

  const { ref: loaderRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px 0px',
  })

  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return
    
    loadingRef.current = true
    setIsLoading(true)
    
    try {
      const res = await fetch(`/api/feed?cursor=${cursor}`)
      const data = await res.json()
      
      setEntries(prev => [...prev, ...data.entries])
      setCursor(data.nextCursor)
    } catch (error) {
      toast({
        title: 'Error loading more entries',
        description: 'Please try again later',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [cursor, toast])

  const handleLikeToggle = useCallback(async (url: string) => {
    if (!userId) return
    
    const normalizedUrl = normalizeUrl(url)
    try {
      const { success, liked } = await toggleMetaLike(normalizedUrl)
      if (success) {
        setLikedUrls(prev => {
          const next = new Set(prev)
          if (liked) {
            next.add(normalizedUrl)
          } else {
            next.delete(normalizedUrl)
          }
          return next
        })
      }
    } catch (error) {
      toast({
        title: 'Error updating like',
        description: 'Please try again later',
        variant: 'destructive'
      })
    }
  }, [userId, toast])

  // Load more when scrolling
  if (inView && !isLoading && cursor) {
    loadMore()
  }

  if (!entries.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No entries found</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] -mr-4 md:-mr-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 md:pb-8">
        {entries.map((entry) => (
          <FeedCard
            key={entry.url}
            entry={entry}
            isLiked={likedUrls.has(normalizeUrl(entry.url))}
            onLikeToggle={handleLikeToggle}
            userId={userId}
          />
        ))}
        
        {cursor && (
          <div ref={loaderRef} className="col-span-full h-20 flex items-center justify-center">
            {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </div>
        )}
      </div>
    </ScrollArea>
  )
} 