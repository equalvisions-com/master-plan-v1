'use client'

import { useTransition, useOptimistic } from 'react'
import { toggleBookmark } from '@/app/actions/bookmark'

interface BookmarkFormProps {
  postId: string
  title: string
  userId: string
  sitemapUrl: string | null
  initialIsBookmarked: boolean
}

export function BookmarkForm({
  postId,
  title,
  userId,
  sitemapUrl,
  initialIsBookmarked
}: BookmarkFormProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticIsBookmarked, setOptimisticIsBookmarked] = useOptimistic(
    initialIsBookmarked,
    (state: boolean) => !state
  )

  const handleToggle = async (formData: FormData) => {
    startTransition(async () => {
      try {
        setOptimisticIsBookmarked(!optimisticIsBookmarked)
        await toggleBookmark(formData)
      } catch (error) {
        // Revert optimistic update on error
        setOptimisticIsBookmarked(optimisticIsBookmarked)
        console.error('Failed to toggle bookmark:', error)
      }
    })
  }

  return (
    <form action={handleToggle}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="sitemapUrl" value={sitemapUrl || ''} />
      <button
        type="submit"
        disabled={isPending}
        className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all
          ${isPending ? 'cursor-not-allowed opacity-50' : ''}
          ${optimisticIsBookmarked 
            ? 'bg-black text-white hover:bg-gray-800' 
            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
      >
        {optimisticIsBookmarked ? 'Bookmarked' : 'Bookmark'}
      </button>
    </form>
  )
} 