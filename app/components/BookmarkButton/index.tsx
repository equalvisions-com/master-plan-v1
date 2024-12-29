import { createClient } from '@/lib/supabase/server'
import { BookmarkForm } from './BookmarkForm'
import type { SitemapUrlField } from '@/app/types/wordpress'
import { unstable_cache } from 'next/cache'
import { BookmarkErrorWrapper } from './BookmarkErrorWrapper'
import { Button } from '@/app/components/ui/button'

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
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return (
      <form action="/login">
        <Button variant="secondary">
          Sign in to Bookmark
        </Button>
      </form>
    )
  }

  const { isBookmarked } = await getCachedBookmarkStatus(postId, user.id)

  return (
    <BookmarkErrorWrapper
      postId={postId}
      userId={user.id}
    >
      <BookmarkForm 
        postId={postId}
        title={title}
        userId={user.id}
        sitemapUrl={getSitemapUrl(sitemapUrl)}
        initialIsBookmarked={isBookmarked}
      />
    </BookmarkErrorWrapper>
  )
} 