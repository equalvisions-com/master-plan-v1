'use client'

import { useEffect, memo } from 'react'
import { useBookmark } from '@/app/hooks/useBookmark'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'
import type { BookmarkState } from '@/app/types/bookmark'

interface BookmarkFormProps {
  postId: string
  title: string
  userId: string
  sitemapUrl: string
  initialIsBookmarked: boolean
}

interface SubmitButtonProps {
  isBookmarked: boolean
  isPending: boolean
}

const SubmitButton = memo(function SubmitButton({ 
  isBookmarked, 
  isPending 
}: SubmitButtonProps) {
  return (
    <button 
      type="submit"
      aria-disabled={isPending}
      disabled={isPending}
      className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all
        ${isPending ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}
        ${isBookmarked 
          ? 'bg-black text-white hover:bg-gray-800' 
          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }`}
    >
      {isPending ? <LoadingSpinner /> : (isBookmarked ? 'Bookmarked' : 'Bookmark')}
    </button>
  )
})

export function BookmarkForm({ 
  postId, 
  title, 
  userId, 
  sitemapUrl, 
  initialIsBookmarked 
}: BookmarkFormProps) {
  const { 
    isBookmarked, 
    toggle, 
    error, 
    isPending 
  } = useBookmark(initialIsBookmarked, {
    postId,
    title,
    userId,
    sitemapUrl
  })

  // Debug logging
  useEffect(() => {
    if (error || isPending) {
      console.log('BookmarkForm state:', {
        postId,
        hasSitemapUrl: !!sitemapUrl,
        initialIsBookmarked,
        currentIsBookmarked: isBookmarked,
        error,
        isPending
      })
    }
  }, [postId, sitemapUrl, initialIsBookmarked, isBookmarked, error, isPending])

  return (
    <form action={toggle} className="relative">
      <SubmitButton 
        isBookmarked={isBookmarked} 
        isPending={isPending} 
      />
      {error && (
        <div 
          className="absolute top-full mt-2 text-sm text-red-500 bg-red-50 px-3 py-1 rounded" 
          role="alert"
        >
          {error}
        </div>
      )}
    </form>
  )
} 