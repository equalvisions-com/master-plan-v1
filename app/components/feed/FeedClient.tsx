'use client'

import { useEffect, useState, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { FeedEntry } from './FeedEntry'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toggleMetaLike } from '@/app/actions/meta-like'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { useToast } from '@/components/ui/use-toast'
import React from 'react'
import useSWRInfinite from 'swr/infinite'
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

export function FeedClient({
  initialEntries,
  initialLikedUrls,
  initialHasMore,
  nextCursor: initialNextCursor,
  userId,
  totalEntries
}: FeedClientProps) {
  const [likedUrls, setLikedUrls] = useState<Set<string>>(new Set(initialLikedUrls))
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '200px 0px',
    delay: 100
  })

  // Define the key generator for SWR
  const getKey = (pageIndex: number, previousPageData: FeedResponse | null) => {
    // First page, we don't have `previousPageData`
    if (pageIndex === 0) return `/api/feed?page=1&timestamp=${Date.now()}`
    
    // Return null if we know we've reached the end
    if (previousPageData && !previousPageData.hasMore) return null
    
    // Add the cursor to the API endpoint
    return `/api/feed?page=${previousPageData?.nextCursor}&timestamp=${Date.now()}`
  }

  // Setup SWR infinite loading
  const {
    data: pagesData,
    size,
    setSize,
    isValidating,
    error
  } = useSWRInfinite<FeedResponse>(
    getKey,
    async (url) => {
      const res = await fetch(url, {
        next: { 
          tags: ['feed'],
          revalidate: 60 
        }
      })
      if (!res.ok) throw new Error('Failed to load more entries')
      return res.json()
    },
    {
      revalidateFirstPage: false,
      persistSize: true,
      fallbackData: initialEntries.length ? [{
        entries: initialEntries,
        hasMore: initialHasMore,
        nextCursor: initialNextCursor
      }] : undefined,
      dedupingInterval: 5000,
      errorRetryCount: 3,
      revalidateOnFocus: false,
      revalidateIfStale: false
    }
  )

  // Flatten and deduplicate entries
  const entries = useMemo(() => {
    if (!pagesData) return initialEntries
    const urlSet = new Set<string>()
    
    return pagesData
      .flatMap(page => page.entries)
      .filter(entry => {
        if (!entry.url || urlSet.has(entry.url)) return false
        urlSet.add(entry.url)
        return true
      })
  }, [pagesData, initialEntries])

  const hasMore = pagesData?.[pagesData.length - 1]?.hasMore ?? false

  // Simplified loading trigger
  useEffect(() => {
    if (inView && hasMore && !isValidating) {
      setSize(size + 1)
    }
  }, [inView, hasMore, isValidating, setSize, size])

  // Optimistic meta counts update using SWR
  const { data: metaCounts, error: metaCountsError } = useSWR<MetaCounts>(
    entries.length ? `/api/meta-counts?urls=${entries.map((e: FeedEntryType) => normalizeUrl(e.url)).join(',')}` : null,
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
  const [entriesWithCounts, setEntriesWithCounts] = useState(entries)
  
  useEffect(() => {
    if (metaCounts && !metaCountsError) {
      setEntriesWithCounts(
        entries.map(entry => {
          const url = normalizeUrl(entry.url)
          return {
            ...entry,
            commentCount: metaCounts.comments[url] ?? entry.commentCount,
            likeCount: metaCounts.likes[url] ?? entry.likeCount
          }
        })
      )
    }
  }, [metaCounts, metaCountsError, entries])

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

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Error loading entries. Please try refreshing.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 md:pb-8">
        <div className="col-span-full mb-4 text-sm text-muted-foreground text-center">
          Showing {entriesWithCounts.length} of {totalEntries} entries
        </div>
        
        {entriesWithCounts.map(entry => (
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
            {isValidating && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </div>
        )}
      </div>
    </ScrollArea>
  )
} 