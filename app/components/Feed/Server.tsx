import { Redis } from '@upstash/redis'
import { prisma } from '@/lib/prisma'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { unstable_cache } from 'next/cache'

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

// Cached function to get feed entries
export const getFeedEntries = unstable_cache(
  async (userId: string, cursor?: string): Promise<{
    entries: FeedEntry[]
    nextCursor: string | null
  }> => {
    // Get user's bookmarked posts
    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: ENTRIES_PER_PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    })

    // Get next cursor
    const nextCursor = bookmarks.length > ENTRIES_PER_PAGE 
      ? bookmarks[ENTRIES_PER_PAGE - 1].id 
      : null
    
    // Get actual entries to process
    const entriesToProcess = bookmarks.slice(0, ENTRIES_PER_PAGE)

    // Get sitemap entries from Redis
    const entries = await Promise.all(
      entriesToProcess.map(async (bookmark) => {
        const sitemapKey = `sitemap:${bookmark.post_id}`
        const entries = await redis.get<FeedEntry[]>(sitemapKey) || []
        return entries
      })
    )

    // Flatten entries and get counts
    const flatEntries = entries.flat()
    const urls = flatEntries.map(entry => normalizeUrl(entry.url))

    // Get counts in parallel
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
    const entriesWithCounts = flatEntries.map(entry => ({
      ...entry,
      commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
      likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0
    }))

    return {
      entries: entriesWithCounts,
      nextCursor
    }
  },
  ['feed-entries'],
  { revalidate: 60, tags: ['feed'] }
) 