import { createClient } from '@/lib/supabase/server'
import { getBookmarkStatus } from '@/app/actions/bookmark'
import { BookmarkForm } from './BookmarkForm'
import type { SitemapUrlField } from '@/app/types/wordpress'
import { unstable_cache } from 'next/cache'
import { cookies } from 'next/headers'

interface BookmarkButtonProps {
  postId: string
  title: string
  sitemapUrl?: SitemapUrlField | string | null | undefined
}

function getSitemapUrl(sitemapUrl: BookmarkButtonProps['sitemapUrl']): string | null {
  if (typeof sitemapUrl === 'string') return sitemapUrl
  if (sitemapUrl && 'sitemapurl' in sitemapUrl) {
    return sitemapUrl.sitemapurl || null
  }
  return null
}

// Move auth check outside of cache
async function getUser() {
  const supabase = await createClient()
  return await supabase.auth.getUser()
}

// Cache the bookmark status check separately
const getCachedBookmarkStatus = unstable_cache(
  async (postId: string, userId: string) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error('Failed to check bookmark status')
    }

    return {
      isBookmarked: !!data
    }
  },
  ['bookmark-status'],
  {
    revalidate: 60,
    tags: ['bookmark-status']
  }
)

export async function BookmarkButton({ postId, title, sitemapUrl }: BookmarkButtonProps) {
  // Get user data outside of cache
  const { data: { user }, error } = await getUser()
  
  if (error || !user) {
    return (
      <form action="/login">
        <button 
          type="submit"
          className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
            bg-gray-200 text-gray-900 hover:bg-gray-300"
        >
          Sign in to Bookmark
        </button>
      </form>
    )
  }

  // Get cached bookmark status with specific tags
  const { isBookmarked } = await getCachedBookmarkStatus(postId, user.id)
  const sitemapUrlString = getSitemapUrl(sitemapUrl)

  return (
    <BookmarkForm 
      postId={postId}
      title={title}
      userId={user.id}
      sitemapUrl={sitemapUrlString}
      initialIsBookmarked={isBookmarked}
    />
  )
} 