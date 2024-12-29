'use client'

import { memo } from 'react'
import { useBookmark } from '@/app/hooks/useBookmark'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'

interface BookmarkFormProps {
  postId: string
  title: string
  userId: string
  sitemapUrl: string | null
  initialIsBookmarked: boolean
}

interface SubmitButtonProps {
  isBookmarked: boolean
  isPending: boolean
  onClick: () => void
}

const SubmitButton = memo(function SubmitButton({ 
  isBookmarked, 
  isPending,
  onClick
}: SubmitButtonProps) {
  return (
    <button 
      type="button"
      disabled={isPending}
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all
        ${isPending ? 'cursor-not-allowed' : ''}
        bg-black text-white hover:bg-gray-800`}
    >
      {isBookmarked ? 'Bookmarked' : 'Bookmark'}
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
  } = useBookmark({
    postId,
    title,
    userId,
    sitemapUrl,
    initialIsBookmarked
  })

  return (
    <div className="relative">
      <SubmitButton 
        isBookmarked={isBookmarked} 
        isPending={isPending} 
        onClick={toggle}
      />
      {error && error.length > 0 && (
        <div 
          className="absolute top-full mt-2 text-sm text-red-500 bg-red-50 px-3 py-1 rounded" 
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  )
} 