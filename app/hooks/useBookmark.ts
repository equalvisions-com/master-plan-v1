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

        setIsBookmarked(!isBookmarked)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
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