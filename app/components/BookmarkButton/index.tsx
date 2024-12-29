import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getBookmarkStatus } from '@/app/actions/bookmarkActions'
import { BookmarkForm } from './BookmarkForm'
import { BookmarkLoading } from './loading'
import type { SitemapUrlField } from '@/app/types/wordpress'
import { ErrorBoundaryWrapper } from './ErrorBoundaryWrapper'

interface BookmarkButtonProps {
  postId: string
  title: string
  sitemapUrl?: SitemapUrlField | string | null | undefined
}

function getSitemapUrl(sitemapUrl: BookmarkButtonProps['sitemapUrl']): string | null {
  if (typeof sitemapUrl === 'string') return sitemapUrl
  
  if (sitemapUrl && 'sitemapurl' in sitemapUrl) {
    if (!sitemapUrl.sitemapurl) return null
    return sitemapUrl.sitemapurl
  }
  
  return null
}

function SignInButton() {
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

// Add preload function for Next.js 15
export async function preloadBookmarkData(postId: string, userId: string) {
  // Preload data into cache
  await getBookmarkStatus(postId, userId)
}

export async function BookmarkButton({ postId, title, sitemapUrl }: BookmarkButtonProps) {
  const supabase = await createClient()
  
  // Get user first
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return <SignInButton />
  }

  // Preload data for instant loading
  await preloadBookmarkData(postId, user.id)

  // Then get bookmark status
  const bookmarkData = await getBookmarkStatus(postId, user.id)
  const sitemapUrlString = getSitemapUrl(sitemapUrl)

  return (
    <Suspense fallback={<BookmarkLoading />}>
      <ErrorBoundaryWrapper 
        postId={postId} 
        userId={user.id}
        onReset={async () => {
          // Clear cache and refetch
          await getBookmarkStatus(postId, user.id)
        }}
      >
        <BookmarkForm 
          postId={postId}
          title={title}
          userId={user.id}
          sitemapUrl={sitemapUrlString}
          initialIsBookmarked={bookmarkData.isBookmarked}
        />
      </ErrorBoundaryWrapper>
    </Suspense>
  )
} 