'use client'

import { useOptimistic, useTransition } from 'react'

interface BookmarkButtonClientProps {
  isBookmarked: boolean
  onToggle: () => Promise<void>
}

export function BookmarkButtonClient({ 
  isBookmarked: initialIsBookmarked, 
  onToggle 
}: BookmarkButtonClientProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticIsBookmarked, setOptimisticIsBookmarked] = useOptimistic(
    initialIsBookmarked,
    (state: boolean) => !state
  )

  return (
    <form action={() => {
      startTransition(async () => {
        setOptimisticIsBookmarked(!optimisticIsBookmarked)
        await onToggle()
      })
    }}>
      <button 
        type="submit"
        disabled={isPending}
        className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
          ${isPending ? 'opacity-50' : ''}
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