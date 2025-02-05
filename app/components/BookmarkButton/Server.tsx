import { Suspense } from 'react'
import { BookmarkButton } from './Client'
import { BookmarkLoading } from './loading'
import type { SitemapUrlField } from '@/app/types/wordpress'
import { User } from '@supabase/supabase-js'
import { unstable_noStore } from 'next/cache'
import { prisma } from '@/lib/prisma'

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

  let isBookmarked = false

  if (user) {
    try {
      // Use Prisma with correct field names matching the schema
      const bookmark = await prisma.bookmark.findUnique({
        where: {
          user_id_post_id: {
            user_id: user.id,
            post_id: postId
          }
        }
      })
      
      isBookmarked = !!bookmark
    } catch (error) {
      console.error('Error fetching bookmark status:', error)
    }
  }

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