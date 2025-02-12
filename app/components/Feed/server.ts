import { Redis } from '@upstash/redis'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { logger } from '@/lib/logger'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

const ENTRIES_PER_PAGE = 10

export interface FeedEntry {
  url: string
  meta: {
    title: string
    description: string
    image: string
  }
  lastmod: string
  commentCount: number
  likeCount: number
}

export interface FeedResponse {
  entries: FeedEntry[]
  nextCursor: string | null
}

export const getFeedEntries = unstable_cache(
  async (userId: string, cursor?: string): Promise<FeedResponse> => {
    try {
      // Get user's bookmarked posts
      const bookmarks = await prisma.bookmark.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: ENTRIES_PER_PAGE + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        select: { post_id: true, id: true }
      })

      logger.info('Found bookmarks:', { count: bookmarks.length, userId })

      const hasMore = bookmarks.length > ENTRIES_PER_PAGE
      const nextCursor = hasMore ? bookmarks[ENTRIES_PER_PAGE].id : null
      const relevantBookmarks = bookmarks.slice(0, ENTRIES_PER_PAGE)

      // Get sitemap entries from Redis for each bookmark
      const entriesPromises = relevantBookmarks.map(async (bookmark) => {
        // Try both possible Redis key formats
        const possibleKeys = [
          `sitemap:${bookmark.post_id}`,
          `post:${bookmark.post_id}:sitemap`,
          `sitemap:entries:${bookmark.post_id}`
        ]

        for (const key of possibleKeys) {
          const entries = await redis.get<FeedEntry[]>(key)
          if (entries && entries.length > 0) {
            logger.info('Found Redis entries:', { key, count: entries.length })
            return entries
          }
        }

        logger.warn('No entries found in Redis for bookmark:', { postId: bookmark.post_id })
        return []
      })

      const allEntries = (await Promise.all(entriesPromises)).flat()
      logger.info('Total entries found:', { count: allEntries.length })

      if (allEntries.length === 0) {
        return { entries: [], nextCursor }
      }

      // Get comment and like counts
      const urls = allEntries.map(entry => normalizeUrl(entry.url))
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

      // Enrich entries with counts
      const enrichedEntries = allEntries.map(entry => ({
        ...entry,
        commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
        likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0
      }))

      // Sort by lastmod date
      const sortedEntries = enrichedEntries.sort((a, b) => 
        new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
      )

      return {
        entries: sortedEntries,
        nextCursor
      }
    } catch (error) {
      logger.error('Error in getFeedEntries:', error)
      throw error
    }
  },
  ['feed-entries'],
  { revalidate: 60, tags: ['feed'] }
)

export const getLikedUrls = unstable_cache(
  async (userId: string): Promise<string[]> => {
    const likes = await prisma.metaLike.findMany({
      where: { user_id: userId },
      select: { meta_url: true }
    })
    return likes.map(like => like.meta_url)
  },
  ['liked-urls'],
  { revalidate: 60, tags: ['likes'] }
) 