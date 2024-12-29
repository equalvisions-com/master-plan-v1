'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { toggleBookmark } from '@/app/actions/bookmark'

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
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [isBookmarked, setIsBookmarked] = useOptimistic(
    initialIsBookmarked,
    (state: boolean) => !state
  )

  const toggle = async () => {
    try {
      setError('')
      startTransition(async () => {
        const formData = new FormData()
        formData.append('postId', postId)
        formData.append('userId', userId)
        formData.append('title', title)
        formData.append('sitemapUrl', sitemapUrl || '')

        const result = await toggleBookmark(formData)
        setIsBookmarked(result.isBookmarked)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle bookmark')
      // Revert optimistic update on error
      setIsBookmarked(initialIsBookmarked)
    }
  }

  return {
    isBookmarked,
    toggle,
    error,
    isPending
  }
} 