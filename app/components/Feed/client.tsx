'use client'

import { useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { FeedCard } from './FeedCard'
import type { FeedEntry } from './Server'
import { Loader2 } from 'lucide-react'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'

interface FeedProps {
  userId: string
  initialEntries: FeedEntry[]
  initialLikedUrls: string[]
  initialNextCursor: string | null
}

export function Feed({ 
  userId, 
  initialEntries, 
  initialLikedUrls,
  initialNextCursor 
}: FeedProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [likedUrls, setLikedUrls] = useState(
    new Set(initialLikedUrls.map(normalizeUrl))
  )
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [isLoading, setIsLoading] = useState(false)

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px 0px',
  })

  // Load more entries when scrolling
  const loadMore = async () => {
    if (!nextCursor || isLoading) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/feed?cursor=${nextCursor}`)
      const data = await res.json()
      
      setEntries(prev => [...prev, ...data.entries])
      setNextCursor(data.nextCursor)
    } catch (error) {
      console.error('Error loading more entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle like toggle
  const handleLikeToggle = (url: string) => {
    const normalizedUrl = normalizeUrl(url)
    setLikedUrls(prev => {
      const next = new Set(prev)
      if (next.has(normalizedUrl)) {
        next.delete(normalizedUrl)
      } else {
        next.add(normalizedUrl)
      }
      return next
    })
  }

  // Load more when scrolling into view
  if (inView) {
    loadMore()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {entries.map((entry) => (
        <FeedCard
          key={entry.url}
          entry={entry}
          isLiked={likedUrls.has(normalizeUrl(entry.url))}
          userId={userId}
          onLikeToggle={handleLikeToggle}
        />
      ))}
      
      {nextCursor && (
        <div 
          ref={loadMoreRef} 
          className="col-span-full h-20 flex items-center justify-center"
        >
          {isLoading && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  )
} 