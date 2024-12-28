'use client'

import { getBookmarkStatus, toggleBookmark } from '@/app/actions/bookmark'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface BookmarkButtonProps {
  postId: string
  title: string
  sitemapUrl: string
}

export function BookmarkButton({ postId, title, sitemapUrl }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    console.log('BookmarkButton mounted, fetching status for postId:', postId)
    getBookmarkStatus(postId).then(({ isBookmarked: bookmarked, userId: id }) => {
      console.log('Bookmark status received:', { bookmarked, userId: id })
      setIsBookmarked(bookmarked)
      setUserId(id)
    })
  }, [postId])

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    console.log('Button clicked, current state:', { isBookmarked, userId })
    
    try {
      setIsLoading(true)
      
      if (!userId) {
        console.log('No user ID, redirecting to login')
        router.push('/login')
        return
      }

      console.log('Toggling bookmark with:', { postId, title, userId, isBookmarked, sitemapUrl })
      await toggleBookmark(postId, title, userId, isBookmarked, sitemapUrl)
      
      setIsBookmarked(!isBookmarked)
      console.log('Bookmark toggled successfully')
    } catch (error) {
      console.error('Error toggling bookmark:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${isBookmarked 
          ? 'bg-black text-white hover:bg-gray-800' 
          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }`}
    >
      {isLoading 
        ? 'Processing...' 
        : isBookmarked 
          ? 'Bookmarked' 
          : 'Bookmark'
      }
    </button>
  )
} 