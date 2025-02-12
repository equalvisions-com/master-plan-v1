'use client'

import { useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useInView } from 'react-intersection-observer'
import useSWRInfinite from 'swr/infinite'
import { Heart, MessageCircle, Share, Loader2 } from 'lucide-react'
import { Card } from '@/app/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { toggleMetaLike } from '@/app/actions/meta-like'
import type { FeedEntry } from './Server'

interface FeedProps {
  initialEntries: FeedEntry[]
  initialCursor: string | null
  userId: string
}

interface FeedResponse {
  entries: FeedEntry[]
  nextCursor: string | null
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function Feed({ initialEntries, initialCursor, userId }: FeedProps) {
  const { toast } = useToast()
  const { ref, inView } = useInView()
  const likeTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({})

  const getKey = (pageIndex: number, previousPageData: FeedResponse | null) => {
    if (previousPageData && !previousPageData.entries?.length) return null
    if (pageIndex === 0) return null // First page is handled by initialData
    const cursor = pageIndex === 1 ? initialCursor : previousPageData?.nextCursor
    if (!cursor) return null
    return `/api/feed?cursor=${cursor}`
  }

  const {
    data: pages,
    size,
    setSize,
    isValidating
  } = useSWRInfinite(getKey, fetcher, {
    fallbackData: [{ entries: initialEntries, nextCursor: initialCursor }],
    revalidateFirstPage: false
  })

  const entries = pages?.flatMap(page => page.entries) ?? initialEntries
  const hasMore = pages?.[pages.length - 1]?.nextCursor != null

  useEffect(() => {
    if (inView && hasMore && !isValidating) {
      setSize(size + 1)
    }
  }, [inView, hasMore, isValidating, setSize, size])

  const handleLike = useCallback(async (url: string) => {
    if (!userId) {
      window.location.href = '/login'
      return
    }

    // Clear existing timeout for this URL
    if (likeTimeoutRef.current[url]) {
      clearTimeout(likeTimeoutRef.current[url])
    }

    // Set new timeout
    likeTimeoutRef.current[url] = setTimeout(async () => {
      try {
        await toggleMetaLike(url)
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to update like',
          variant: 'destructive'
        })
      }
    }, 500)
  }, [userId, toast])

  return (
    <ScrollArea className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 md:pb-8">
        {entries.map((entry) => (
          <Card key={entry.url} className="group hover:shadow-lg transition-shadow overflow-hidden">
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
                    onClick={() => handleLike(entry.url)}
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <Heart className="h-4 w-4" />
                    <span className="text-xs">{entry.likeCount}</span>
                  </button>
                  
                  <button className="inline-flex items-center gap-1 hover:text-primary">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs">{entry.commentCount}</span>
                  </button>
                  
                  <button className="inline-flex items-center gap-1 hover:text-primary">
                    <Share className="h-4 w-4" />
                  </button>
                  
                  <time dateTime={entry.lastmod} className="ml-auto text-xs">
                    {new Date(entry.lastmod).toLocaleDateString()}
                  </time>
                </div>
              </div>
            </div>
          </Card>
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