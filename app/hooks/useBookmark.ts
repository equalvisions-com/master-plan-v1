'use client'

import { useState, useTransition } from 'react'
import { toggleBookmarkAction } from '@/app/actions/bookmark'

interface UseBookmarkOptions {
  postId: string
  title: string
  userId: string
  sitemapUrl: string
  initialIsBookmarked: boolean
}

export function useBookmark({
  postId,
  title,
  userId,
  sitemapUrl,
  initialIsBookmarked
}: UseBookmarkOptions) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    if (isPending) return

    startTransition(async () => {
      try {
        setError(null)
        
        const result = await toggleBookmarkAction(
          postId,
          title,
          userId,
          sitemapUrl,
          isBookmarked
        )

        if (!result.success) {
          setError(result.error || 'Failed to update bookmark')
          return
        }

        // Only update state after successful server action
        setIsBookmarked(!isBookmarked)
      } catch (err) {
        console.error('Bookmark error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        // Revert optimistic update on error
        setIsBookmarked(isBookmarked)
      }
    })
  }

  return {
    isBookmarked,
    toggle,
    error,
    isPending
  }
} 