import { Suspense } from 'react'
import { getBookmarkStatus } from '@/app/actions/bookmark'
import { BookmarkForm } from './BookmarkForm'
import { BookmarkLoading } from './loading'
import type { SitemapUrlField } from '@/app/types/wordpress'
import { ErrorBoundaryWrapper } from './ErrorBoundaryWrapper'
import { User } from '@supabase/supabase-js'
import { Heart } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

interface BookmarkButtonProps {
  postId: string
  title: string
  sitemapUrl?: SitemapUrlField | string | null | undefined
  user: User | null
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
      <Button 
        type="submit"
        variant="outline" 
        size="icon"
        className="rounded-full h-9 w-9"
      >
        <Heart className="h-4 w-4" />
      </Button>
    </form>
  )
}

export async function BookmarkButton({ postId, title, sitemapUrl, user }: BookmarkButtonProps) {
  if (!user) {
    return <SignInButton />
  }

  const { isBookmarked } = await getBookmarkStatus(postId, user.id)
  const sitemapUrlString = getSitemapUrl(sitemapUrl)

  return (
    <ErrorBoundaryWrapper postId={postId} userId={user.id}>
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

export type { BookmarkButtonProps } 