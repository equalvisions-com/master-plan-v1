import { Suspense } from 'react'
import { getBookmarkStatus } from '@/app/actions/bookmark'
import { BookmarkButton } from './Client'
import { BookmarkLoading } from './loading'
import type { SitemapUrlField } from '@/app/types/wordpress'
import { User } from '@supabase/supabase-js'
import { unstable_noStore } from 'next/cache'

interface BookmarkButtonServerProps {
  postId: string
  title: string
  sitemapUrl?: SitemapUrlField | string | null | undefined
  user: User | null
}

function getSitemapUrl(sitemapUrl: BookmarkButtonServerProps['sitemapUrl']): string | null {
  if (typeof sitemapUrl === 'string') return sitemapUrl
  
  if (sitemapUrl && 'sitemapurl' in sitemapUrl) {
    if (!sitemapUrl.sitemapurl) return null
    return sitemapUrl.sitemapurl
  }
  
  return null
}

export async function BookmarkButtonServer({ 
  postId, 
  title, 
  sitemapUrl, 
  user 
}: BookmarkButtonServerProps) {
  unstable_noStore()

  const { isBookmarked } = user ? await getBookmarkStatus(postId, user.id) : { isBookmarked: false }
  const sitemapUrlString = getSitemapUrl(sitemapUrl)

  return (
    <Suspense fallback={<BookmarkLoading />}>
      <BookmarkButton 
        postId={postId}
        title={title}
        user={user}
        sitemapUrl={sitemapUrlString}
        initialIsBookmarked={isBookmarked}
      />
    </Suspense>
  )
} 