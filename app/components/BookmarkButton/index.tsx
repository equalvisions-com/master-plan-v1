import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { createClient } from '@/lib/supabase/server'
import { getBookmarkStatus } from '@/app/actions/bookmark'
import { BookmarkForm } from './BookmarkForm'
import { BookmarkError } from './error'
import { BookmarkLoading } from './loading'

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

  return (
    <ErrorBoundary
      FallbackComponent={BookmarkError}
      onReset={async () => {
        // Attempt to reset the state when the user clicks "Try again"
        await getBookmarkStatus(postId)
      }}
    >
      <Suspense fallback={<BookmarkLoading />}>
        <BookmarkForm 
          postId={postId}
          title={title}
          userId={user.id}
          sitemapUrl={sitemapUrl}
          initialIsBookmarked={isBookmarked}
        />
      </Suspense>
    </ErrorBoundary>
  )
} 