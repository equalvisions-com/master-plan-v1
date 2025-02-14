'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { toggleBookmarkAction } from '@/app/actions/bookmark'

interface UseBookmarkOptions {
  postId: string
  title: string
  userId: string
  sitemapUrl: string | null
  initialIsBookmarked: boolean
  featuredImage?: string | null
}

export function useBookmark({
  postId,
  title,
  userId,
  sitemapUrl,
  initialIsBookmarked,
  featuredImage
}: UseBookmarkOptions) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  
  const [optimisticBookmark, setOptimisticBookmark] = useOptimistic(
    initialIsBookmarked,
    (state: boolean) => !state
  )

  const toggle = () => {
    if (isPending) return

    startTransition(async () => {
      try {
        setError(null)
        // Update optimistically first
        setOptimisticBookmark(!optimisticBookmark)
        
        const result = await toggleBookmarkAction(
          postId,
          title,
          userId,
          sitemapUrl ?? '',
          optimisticBookmark,
          featuredImage
        )

        if (!result.success) {
          // Revert on error
          setOptimisticBookmark(optimisticBookmark)
          setError(result.error || 'Failed to update bookmark')
          return
        }
      } catch (err) {
        // Revert on error
        setOptimisticBookmark(optimisticBookmark)
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  return {
    isBookmarked: optimisticBookmark,
    toggle,
    error,
    isPending
  }
} 