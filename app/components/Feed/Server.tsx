import { Redis } from '@upstash/redis'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import type { SitemapEntry } from '@/app/lib/sitemap/types'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export interface FeedEntry extends SitemapEntry {
  commentCount: number
  likeCount: number
}

// Cache feed data fetching
const getFeedEntries = unstable_cache(
  async (userId: string, cursor?: string): Promise<{
    entries: FeedEntry[]
    nextCursor: string | null
  }> => {
    // Get user's bookmarked posts
    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 10,
      ...(cursor ? {
        cursor: { id: cursor },
        skip: 1
      } : {})
    })

    // Get sitemap entries from Redis
    const entries = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const key = `sitemap:${bookmark.post_id}`
        const entries = await redis.get<SitemapEntry[]>(key) || []
        return entries
      })
    )

    // Flatten and sort entries
    const flatEntries = entries
      .flat()
      .sort((a, b) => new Date(b.lastmod || 0).getTime() - new Date(a.lastmod || 0).getTime())
      .slice(0, 20)

    // Get counts for entries
    const urls = flatEntries.map(entry => entry.url)
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

    // Map counts to entries
    const entriesWithCounts: FeedEntry[] = flatEntries.map(entry => ({
      ...entry,
      commentCount: commentCounts.find(c => c.url === entry.url)?._count.id || 0,
      likeCount: likeCounts.find(l => l.meta_url === entry.url)?._count.id || 0
    }))

    return {
      entries: entriesWithCounts,
      nextCursor: bookmarks[bookmarks.length - 1]?.id || null
    }
  },
  ['feed-entries'],
  { revalidate: 60, tags: ['feed'] }
)

export async function getFeedData(userId: string, cursor?: string) {
  const [feedData, likedUrls] = await Promise.all([
    getFeedEntries(userId, cursor),
    prisma.metaLike.findMany({
      where: { user_id: userId },
      select: { meta_url: true }
    })
  ])

  return {
    ...feedData,
    initialLikedUrls: likedUrls.map(like => like.meta_url)
  }
} 