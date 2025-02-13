'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { FeedEntry } from './FeedEntry'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toggleMetaLike } from '@/app/actions/meta-like'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { useToast } from '@/components/ui/use-toast'

interface FeedEntryType {
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

interface FeedResponse {
  entries: FeedEntryType[]
  nextCursor: number | null
  hasMore: boolean
}

interface FeedClientProps {
  initialEntries: FeedEntryType[]
  initialLikedUrls: string[]
  initialHasMore: boolean
  nextCursor: number | null
  userId?: string | null
  totalEntries: number
}

export function FeedClient({
  initialEntries,
  initialLikedUrls,
  initialHasMore,
  nextCursor: initialNextCursor,
  userId,
  totalEntries
}: FeedClientProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [likedUrls, setLikedUrls] = useState<Set<string>>(new Set(initialLikedUrls))
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '200px 0px',
  })

  useEffect(() => {
    const channel = supabase.channel('feed-likes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meta_likes',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (!payload.new && !payload.old) return
          
          setLikedUrls(prev => {
            const next = new Set(prev)
            if (payload.eventType === 'INSERT' && payload.new) {
              next.add(normalizeUrl(payload.new.meta_url))
            } else if (payload.eventType === 'DELETE' && payload.old) {
              next.delete(normalizeUrl(payload.old.meta_url))
            }
            return next
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  useEffect(() => {
    const loadMore = async () => {
      if (!inView || !hasMore || isLoading || !nextCursor) return
      
      try {
        setIsLoading(true)
        const res = await fetch(`/api/feed?cursor=${nextCursor}`)
        if (!res.ok) throw new Error('Failed to load more entries')
        
        const data: FeedResponse = await res.json()
        setEntries(prev => [...prev, ...data.entries])
        setHasMore(data.hasMore)
        setNextCursor(data.nextCursor)
      } catch (err) {
        toast({
          title: 'Error loading more entries',
          description: err instanceof Error ? err.message : 'Please try again later',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadMore()
  }, [inView, hasMore, isLoading, nextCursor, toast])

  const handleLikeToggle = async (url: string) => {
    if (!userId) return
    
    const normalizedUrl = normalizeUrl(url)
    const wasLiked = likedUrls.has(normalizedUrl)
    
    try {
      setLikedUrls(prev => {
        const next = new Set(prev)
        if (wasLiked) {
          next.delete(normalizedUrl)
        } else {
          next.add(normalizedUrl)
        }
        return next
      })

      const { success, error } = await toggleMetaLike(normalizedUrl)
      if (!success) throw new Error(error)
      
    } catch (err) {
      setLikedUrls(prev => {
        const next = new Set(prev)
        if (wasLiked) {
          next.add(normalizedUrl)
        } else {
          next.delete(normalizedUrl)
        }
        return next
      })
      
      toast({
        title: 'Error updating like',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive'
      })
    }
  }

  return (
    <ScrollArea className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4 md:pb-8">
        <div className="col-span-full mb-4 text-sm text-muted-foreground text-center">
          Showing {entries.length} of {totalEntries} entries
        </div>
        
        {entries.map(entry => (
          <FeedEntry
            key={entry.url}
            entry={entry}
            isLiked={likedUrls.has(normalizeUrl(entry.url))}
            onLikeToggle={handleLikeToggle}
            onCommentToggle={() => {}} // Placeholder for comment functionality
            userId={userId}
          />
        ))}
        
        {hasMore && (
          <div ref={ref} className="col-span-full h-20 flex items-center justify-center">
            {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </div>
        )}
      </div>
    </ScrollArea>
  )
} 