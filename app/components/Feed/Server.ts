import { Redis } from '@upstash/redis'
import { prisma } from '@/lib/prisma'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'

interface SitemapEntry {
  url: string
  meta: {
    title: string
    description: string
    image: string
  }
  lastmod: string
}

interface FeedResponse {
  entries: Array<SitemapEntry & {
    commentCount: number
    likeCount: number
  }>
  nextCursor: string | null
  total: number
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

const ENTRIES_PER_PAGE = 20

export async function getFeedEntries(userId: string, cursor?: string): Promise<FeedResponse> {
  try {
    // Get user's bookmarked posts
    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: userId },
      select: { id: true, post_id: true },
      take: ENTRIES_PER_PAGE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    })

    if (!bookmarks.length) {
      return { entries: [], nextCursor: null, total: 0 }
    }

    // Get sitemap entries from Redis for each bookmarked post
    const entriesPromises = bookmarks.map(async (bookmark) => {
      const entries = await redis.get<SitemapEntry[]>(`sitemap:${bookmark.post_id}`)
      return entries || []
    })

    const allEntries = (await Promise.all(entriesPromises)).flat()

    // Get counts for each entry
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

    // Add counts to entries and sort by date
    const entriesWithCounts = allEntries
      .map(entry => ({
        ...entry,
        commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
        likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0
      }))
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    return {
      entries: entriesWithCounts,
      nextCursor: bookmarks[bookmarks.length - 1]?.id || null,
      total: entriesWithCounts.length
    }
  } catch (error) {
    console.error('Error fetching feed entries:', error)
    return { entries: [], nextCursor: null, total: 0 }
  }
} 