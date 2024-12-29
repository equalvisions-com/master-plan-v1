import { BookmarkForm } from './BookmarkForm'
import type { SitemapUrlField } from '@/app/types/wordpress'
import { BookmarkErrorWrapper } from './BookmarkErrorWrapper'
import { unstable_noStore } from 'next/cache'
import { getBookmarkStatus } from '@/app/actions/bookmark-status'
import { Suspense } from 'react'
import { BookmarkLoading } from './loading'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

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

export async function BookmarkButton({ postId, title, sitemapUrl }: BookmarkButtonProps) {
  // Prevent caching of the entire component
  unstable_noStore()
  
  // Get user from Prisma instead of Supabase
  const user = await prisma.user.findFirst({
    where: {
      deleted_at: null
    },
    select: {
      id: true
    }
  })
  
  if (!user) {
    redirect('/login')
  }

  return (
    <Suspense fallback={<BookmarkLoading />}>
      <BookmarkContent 
        postId={postId}
        title={title}
        userId={user.id}
        sitemapUrl={sitemapUrl}
      />
    </Suspense>
  )
}

async function BookmarkContent({ 
  postId, 
  title, 
  userId,
  sitemapUrl 
}: {
  postId: string
  title: string
  userId: string
  sitemapUrl?: SitemapUrlField | string | null | undefined
}) {
  const { isBookmarked } = await getBookmarkStatus(postId, userId)

  return (
    <BookmarkErrorWrapper
      postId={postId}
      userId={userId}
    >
      <BookmarkForm 
        postId={postId}
        title={title}
        userId={userId}
        sitemapUrl={getSitemapUrl(sitemapUrl)}
        initialIsBookmarked={isBookmarked}
      />
    </BookmarkErrorWrapper>
  )
} 