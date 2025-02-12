import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getProcessedSitemapEntries } from '@/app/lib/redis/feed'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { FeedClient } from './FeedClient'
import { unstable_noStore as noStore } from 'next/cache'

export async function FeedServer() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get bookmarked posts' sitemaps
  const bookmarks = await prisma.bookmark.findMany({
    where: { user_id: user.id },
    select: { sitemapUrl: true }
  })

  console.log('Found bookmarks:', bookmarks) // Debug log

  if (!bookmarks.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No bookmarked posts yet
      </div>
    )
  }

  // Get liked URLs for initial state
  const likes = await prisma.metaLike.findMany({
    where: { user_id: user.id },
    select: { meta_url: true }
  })
  const likedUrls = likes.map(like => normalizeUrl(like.meta_url))

  // Get all entries from all sitemaps
  const sitemapUrls = bookmarks.map(b => b.sitemapUrl).filter(Boolean)
  console.log('Fetching sitemaps:', sitemapUrls) // Debug log

  const { entries, nextCursor, hasMore, total } = await getProcessedSitemapEntries(sitemapUrls)
  console.log('Got entries:', entries.length, 'of', total) // Debug log

  // Get comment and like counts
  const urls = entries.map(entry => normalizeUrl(entry.url))
  const [commentCounts, likeCounts] = await Promise.all([
    prisma.comment.groupBy({
      by: ['url'],
      _count: { id: true },
      where: { url: { in: urls } }
    }),
    prisma.metaLike.groupBy({
      by: ['meta_url'],
      _count: { id: true },
      where: { meta_url: { in: urls } }
    })
  ])

  // Create maps for O(1) lookup
  const commentCountMap = new Map(
    commentCounts.map(count => [normalizeUrl(count.url), count._count.id])
  )
  const likeCountMap = new Map(
    likeCounts.map(count => [normalizeUrl(count.meta_url), count._count.id])
  )

  // Add counts to entries
  const entriesWithCounts = entries.map(entry => ({
    ...entry,
    commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
    likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0
  }))

  return (
    <FeedClient
      initialEntries={entriesWithCounts}
      initialLikedUrls={likedUrls}
      initialHasMore={hasMore}
      nextCursor={nextCursor}
      userId={user.id}
      totalEntries={total}
    />
  )
} 