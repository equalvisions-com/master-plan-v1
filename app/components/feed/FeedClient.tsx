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
import React from 'react'
import useSWR from 'swr'
import type { FeedEntryType } from '@/app/types/feed'

interface FeedResponse {
  entries: FeedEntryType[]
  nextCursor: number | null
  hasMore: boolean
  processedUrls: string[]
  unprocessedUrls: string[]
}

interface FeedClientProps {
  initialEntries: FeedEntryType[]
  initialLikedUrls: string[]
  initialHasMore: boolean
  nextCursor: number | null
  userId?: string | null
  totalEntries: number
  processedUrls: string[]
  unprocessedUrls: string[]
}

interface MetaCounts {
  comments: { [url: string]: number }
  likes: { [url: string]: number }
}

// Create a reusable fetch function
const fetchMoreEntries = async (cursor: number, processedUrls: string[], unprocessedUrls: string[]): Promise<FeedResponse> => {
  const params = new URLSearchParams({
    page: cursor.toString(),
    timestamp: Date.now().toString(),
    processedUrls: JSON.stringify(processedUrls),
    unprocessedUrls: JSON.stringify(unprocessedUrls)
  })
  
  const res = await fetch(`/api/feed?${params.toString()}`, {
    next: { 
      tags: ['feed'],
      revalidate: 60 
    }
  })
  
  if (!res.ok) throw new Error('Failed to load more entries')
  return res.json()
}

// Create a request queue to handle pagination requests
const createRequestQueue = () => {
  let currentRequest: Promise<FeedResponse> | null = null;
  
  return async (cursor: number, processedUrls: string[], unprocessedUrls: string[]): Promise<FeedResponse> => {
    // Wait for any existing request to complete
    if (currentRequest) {
      await currentRequest;
    }
    
    // Create new request
    currentRequest = fetchMoreEntries(cursor, processedUrls, unprocessedUrls);
    
    try {
      return await currentRequest;
    } finally {
      currentRequest = null;
    }
  }
};

export function FeedClient({
  initialEntries,
  initialLikedUrls,
  initialHasMore,
  nextCursor: initialNextCursor,
  userId,
  totalEntries,
  processedUrls: initialProcessedUrls,
  unprocessedUrls: initialUnprocessedUrls
}: FeedClientProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [likedUrls, setLikedUrls] = useState<Set<string>>(new Set(initialLikedUrls.map(normalizeUrl)))
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedCommentUrl, setExpandedCommentUrl] = useState<string | null>(null)
  const [processedUrls, setProcessedUrls] = useState(initialProcessedUrls)
  const [unprocessedUrls, setUnprocessedUrls] = useState(initialUnprocessedUrls)
  const { ref, inView } = useInView()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const requestQueue = React.useRef(createRequestQueue())

  // Optimized SWR configuration for meta counts
  const { data: metaCounts, error: metaCountsError } = useSWR<MetaCounts>(
    entries.length ? `/api/meta-counts?urls=${entries.map(e => normalizeUrl(e.url)).join(',')}` : null,
    {
      refreshInterval: 30000,
      dedupingInterval: 5000,
      errorRetryCount: 3
    }
  )

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
    let isMounted = true
    let isLoadingRef = false
    let timeoutId: NodeJS.Timeout | undefined = undefined

    const loadMore = async () => {
      if (!inView || !hasMore || isLoadingRef || !nextCursor) return
      
      try {
        isLoadingRef = true
        setIsLoading(true)
        
        const data = await requestQueue.current(
          parseInt(nextCursor.toString(), 10),
          processedUrls,
          unprocessedUrls
        )
        
        if (isMounted) {
          setEntries(prev => {
            // Filter out duplicates but use server-processed entries directly
            const newEntries = data.entries.filter(
              newEntry => !prev.some(
                existingEntry => existingEntry.url === newEntry.url
              )
            )
            return [...prev, ...newEntries]
          })
          setHasMore(data.hasMore)
          setNextCursor(data.nextCursor)
          // Update the URL lists with the latest from the server
          setProcessedUrls(data.processedUrls)
          setUnprocessedUrls(data.unprocessedUrls)
        }
      } catch (err) {
        if (isMounted) {
          toast({
            title: 'Error loading more entries',
            description: err instanceof Error ? err.message : 'Please try again later',
            variant: 'destructive'
          })
        }
      } finally {
        if (isMounted) {
          isLoadingRef = false
          setIsLoading(false)
        }
      }
    }

    // Add debouncing to loadMore
    clearTimeout(timeoutId)
    timeoutId = setTimeout(loadMore, 100)

    return () => { 
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [inView, hasMore, nextCursor, processedUrls, unprocessedUrls, toast])

  // Update entries with latest counts
  useEffect(() => {
    if (metaCounts && !metaCountsError) {
      setEntries(currentEntries => 
        currentEntries.map(entry => {
          const url = normalizeUrl(entry.url)
          return {
            ...entry,
            commentCount: metaCounts.comments[url] ?? entry.commentCount,
            likeCount: metaCounts.likes[url] ?? entry.likeCount
          }
        })
      )
    }
  }, [metaCounts, metaCountsError])

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

  const handleCommentToggle = (url: string) => {
    setExpandedCommentUrl(prev => prev === url ? null : url)
  }

  return (
    <ScrollArea className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 md:pb-8">
        <div className="col-span-full mb-4 text-sm text-muted-foreground text-center">
          Showing {entries.length} of {totalEntries} entries
        </div>
        
        {entries.map(entry => (
          <FeedEntry
            key={entry.url}
            entry={entry}
            isLiked={likedUrls.has(normalizeUrl(entry.url))}
            onLikeToggle={handleLikeToggle}
            onCommentToggle={handleCommentToggle}
            userId={userId}
            sitemap={entry.sitemap}
            isCommentsExpanded={expandedCommentUrl === entry.url}
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