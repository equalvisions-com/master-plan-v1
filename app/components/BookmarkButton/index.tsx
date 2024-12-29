import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getBookmarkStatus } from '@/app/actions/bookmark'
import { BookmarkForm } from './BookmarkForm'
import type { SitemapUrlField } from '@/app/types/wordpress'
import { unstable_cache } from 'next/cache'

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

// Cache the auth check with a short TTL
const getCachedUser = unstable_cache(
  async () => {
    const supabase = await createClient()
    return await supabase.auth.getUser()
  },
  ['auth-user'],
  { revalidate: 60 } // Cache for 1 minute
)

export async function BookmarkButton({ postId, title, sitemapUrl }: BookmarkButtonProps) {
  const { data: { user }, error } = await getCachedUser()
  
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
  const { isBookmarked } = await getBookmarkStatus(postId, user.id)
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