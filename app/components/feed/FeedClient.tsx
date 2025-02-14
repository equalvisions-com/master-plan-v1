'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { FeedEntry } from './FeedEntry'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, AlertCircle } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toggleMetaLike } from '@/app/actions/meta-like'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { useToast } from '@/components/ui/use-toast'
import React from 'react'
import useSWR from 'swr'

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

interface MetaCounts {
  comments: { [url: string]: number }
  likes: { [url: string]: number }
}

// Create a reusable fetch function
const fetchMoreEntries = async (cursor: number): Promise<FeedResponse> => {
  const params = new URLSearchParams({
    page: cursor.toString(),
    timestamp: Date.now().toString()
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

// Enhanced fetch with retry logic
const fetchWithRetry = async (cursor: number, attempts = 3): Promise<FeedResponse> => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchMoreEntries(cursor)
    } catch (error) {
      if (i === attempts - 1) throw error
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
    }
  }
  throw new Error('Failed to fetch after retries')
}

// Enhanced request queue
const createRequestQueue = () => {
  let currentRequest: Promise<FeedResponse> | null = null
  let isProcessing = false
  let lastProcessedCursor: number | null = null
  
  return async (cursor: number): Promise<FeedResponse> => {
    if (cursor === lastProcessedCursor) {
      return Promise.reject(new Error('Page already loaded'))
    }
    
    if (isProcessing || currentRequest) {
      return Promise.reject(new Error('Request in progress'))
    }
    
    isProcessing = true
    
    try {
      // Add timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      })
      
      currentRequest = fetchWithRetry(cursor)
      const response = await Promise.race([currentRequest, timeoutPromise])
      lastProcessedCursor = cursor
      return response
    } finally {
      currentRequest = null
      isProcessing = false
    }
  }
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
  
  // Enhanced loading state
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'error'>('idle')
  const isLoading = loadingState === 'loading'
  const hasError = loadingState === 'error'
  
  // Refs for state tracking
  const loadingRef = React.useRef(false)
  const isLoadingNextPage = React.useRef(false)
  const requestQueue = React.useRef(createRequestQueue())

  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '50px 0px',
    skip: !hasMore,
  })

  // Error recovery
  useEffect(() => {
    if (hasError && inView) {
      const timer = setTimeout(() => setLoadingState('idle'), 5000)
      return () => clearTimeout(timer)
    }
  }, [hasError, inView])

  // Pagination effect
  useEffect(() => {
    let mounted = true
    
    if (!inView || !hasMore || !nextCursor) return
    if (loadingRef.current || isLoadingNextPage.current) return
    
    const loadMore = async () => {
      try {
        isLoadingNextPage.current = true
        loadingRef.current = true
        setLoadingState('loading')
        
        const data = await requestQueue.current(nextCursor)
        
        if (mounted) {
          setEntries(prev => {
            const newEntries = data.entries.filter(
              newEntry => !prev.some(
                existingEntry => existingEntry.url === newEntry.url
              )
            )
            return [...prev, ...newEntries]
          })
          setHasMore(data.hasMore)
          setNextCursor(data.nextCursor)
          setLoadingState('idle')
        }
      } catch (err) {
        if (mounted) {
          setLoadingState('error')
          toast({
            title: 'Error loading more entries',
            description: err instanceof Error ? err.message : 'Please try again later',
            variant: 'destructive'
          })
        }
      } finally {
        if (mounted) {
          isLoadingNextPage.current = false
          loadingRef.current = false
        }
      }
    }
    
    void loadMore()
    return () => { mounted = false }
  }, [inView, hasMore, nextCursor, toast])

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
    // Add error handling with toast
    if (metaCountsError) {
      toast({
        title: 'Error updating counts',
        description: 'Failed to get latest comment and like counts',
        variant: 'destructive'
      })
    }
  }, [metaCounts, metaCountsError, toast])

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
    <ScrollArea 
      className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]"
      type="always"
      scrollHideDelay={0}
    >
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
            onCommentToggle={() => {}}
            userId={userId}
          />
        ))}
        
        {hasMore && (
          <div ref={ref} className="col-span-full h-20 flex items-center justify-center">
            {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
            {hasError && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load more entries</span>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
} 