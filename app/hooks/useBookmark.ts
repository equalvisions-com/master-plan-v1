'use client'

import { useOptimistic, useState, useCallback } from 'react'
import { bookmarkAction } from '@/app/actions/bookmarkActions'
import type { BookmarkState } from '@/app/types/bookmark'

interface UseBookmarkOptions {
  postId: string
  title: string
  userId: string
  sitemapUrl?: string
  shouldRevalidateProfile?: boolean
}

export type BookmarkError = 
  | { type: 'NETWORK_ERROR'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'DATABASE_ERROR'; message: string }

export function useBookmark(
  initialState: boolean,
  { postId, title, userId, sitemapUrl, shouldRevalidateProfile }: UseBookmarkOptions
) {
  const [isBookmarked, setIsBookmarked] = useOptimistic(initialState)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const toggle = useCallback(async () => {
    const newState = !isBookmarked
    setIsPending(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('postId', postId)
      formData.append('title', title)
      formData.append('userId', userId)
      formData.append('sitemapUrl', sitemapUrl || '')
      formData.append('isBookmarked', newState.toString())
      formData.append('shouldRevalidateProfile', String(shouldRevalidateProfile))

      setIsBookmarked(newState) // Optimistic update
      const result = await bookmarkAction(formData)

      if (result.error) {
        setError(result.error)
        setIsBookmarked(!newState) // Revert on error
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bookmark')
      setIsBookmarked(!newState) // Revert on error
    } finally {
      setIsPending(false)
    }
  }, [postId, title, userId, sitemapUrl, isBookmarked, shouldRevalidateProfile])

  return { 
    isBookmarked, 
    toggle, 
    error,
    isPending 
  }
} 