import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getProcessedSitemapEntries } from '@/app/lib/redis/feed'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { FeedClient } from './FeedClient'
import { unstable_noStore as noStore } from 'next/cache'

interface Post {
  sitemap_url: string | null;
}

async function getBookmarkedSitemapKeys(userId: string) {
  const bookmarks = await prisma.bookmark.findMany({
    where: { user_id: userId },
    select: { post_id: true }
  })

  const posts = await prisma.$queryRaw<Post[]>`
    SELECT sitemap_url
    FROM posts
    WHERE id IN (${bookmarks.map(b => b.post_id).join(',')})
  `

  return posts
    .map(post => post.sitemap_url)
    .filter((url): url is string => !!url)
    .map(url => `sitemap.${new URL(url).hostname}.processed`)
}

async function getLikedUrls(userId: string) {
  const likes = await prisma.metaLike.findMany({
    where: { user_id: userId },
    select: { meta_url: true }
  })
  
  return likes.map(like => normalizeUrl(like.meta_url))
}

export async function FeedServer() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const [sitemapKeys, likedUrls] = await Promise.all([
    getBookmarkedSitemapKeys(user.id),
    getLikedUrls(user.id)
  ])

  const { entries, nextCursor, hasMore } = await getProcessedSitemapEntries(sitemapKeys)

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
    />
  )
} 