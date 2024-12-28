'use client'

import { getBookmarkStatus, toggleBookmark } from '@/app/actions/bookmark'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface BookmarkButtonProps {
  postId: string
  title: string
}

export function BookmarkButton({ postId, title }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    getBookmarkStatus(postId).then(({ isBookmarked: bookmarked, userId: id }) => {
      setIsBookmarked(bookmarked)
      setUserId(id)
    })
  }, [postId])

  const handleClick = async () => {
    if (!userId) {
      router.push('/login')
      return
    }

    await toggleBookmark(postId, title, userId, isBookmarked)
    setIsBookmarked(!isBookmarked)
  }

  return (
    <button 
      onClick={handleClick}
      className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
        ${isBookmarked 
          ? 'bg-black text-white hover:bg-gray-800' 
          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }`}
    >
      {isBookmarked ? 'Bookmarked' : 'Bookmark'}
    </button>
  )
} 