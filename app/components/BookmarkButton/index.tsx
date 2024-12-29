import { Suspense, useMemo } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getBookmarkStatus } from '@/app/actions/bookmark'
import { BookmarkForm } from './BookmarkForm'
import { BookmarkLoading } from './loading'
import { ErrorBoundaryWrapper } from './ErrorBoundaryWrapper'
import type { SitemapUrlField } from '@/app/types/wordpress'

interface BookmarkButtonProps {
  postId: string
  title: string
  sitemapUrl?: SitemapUrlField | string | null | undefined
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

  // Handle different sitemapUrl types and undefined
  const sitemapUrlString = useMemo(() => {
    if (typeof sitemapUrl === 'string') return sitemapUrl
    if (sitemapUrl?.sitemapurl) return sitemapUrl.sitemapurl
    return `/posts/${postId}` // Fallback URL
  }, [sitemapUrl, postId])

  return (
    <ErrorBoundaryWrapper postId={postId}>
      <Suspense fallback={<BookmarkLoading />}>
        <BookmarkForm 
          postId={postId}
          title={title}
          userId={user.id}
          sitemapUrl={sitemapUrlString}
          initialIsBookmarked={isBookmarked}
        />
      </Suspense>
    </ErrorBoundaryWrapper>
  )
} 