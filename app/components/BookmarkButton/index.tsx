import { toggleBookmark, getBookmarkStatus } from '@/app/actions/bookmark'
import { createClient } from '@/lib/supabase/server'
import { BookmarkButtonClient } from './client'

interface BookmarkButtonProps {
  postId: string
  title: string
  sitemapUrl: string
}

export async function BookmarkButton({ postId, title, sitemapUrl }: BookmarkButtonProps) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return (
      <form action="/login">
        <button 
          type="submit"
          className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
            bg-gray-200 text-gray-900 hover:bg-gray-300"
        >
          Bookmark
        </button>
      </form>
    )
  }

  const { isBookmarked } = await getBookmarkStatus(postId)

  async function handleToggle() {
    'use server'
    if (!user?.id) return
    await toggleBookmark(postId, title, user.id, isBookmarked, sitemapUrl)
  }

  return <BookmarkButtonClient isBookmarked={isBookmarked} onToggle={handleToggle} />
} 