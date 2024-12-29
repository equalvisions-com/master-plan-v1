'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { bookmarkAction } from '@/app/actions/bookmarkActions'

interface UseBookmarkOptions {
  postId: string
  title: string
  userId: string
  sitemapUrl: string | null
  initialIsBookmarked: boolean
}

export function useBookmark({
  postId,
  title,
  userId,
  sitemapUrl,
  initialIsBookmarked
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
        
        const formData = new FormData()
        formData.append('postId', postId)
        formData.append('title', title)
        formData.append('userId', userId)
        formData.append('sitemapUrl', sitemapUrl || '')
        formData.append('isBookmarked', String(optimisticBookmark))

        const result = await bookmarkAction(formData)

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