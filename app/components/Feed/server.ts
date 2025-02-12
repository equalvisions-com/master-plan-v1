import { Redis } from '@upstash/redis'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

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

const ENTRIES_PER_PAGE = 10

export const getFeedEntries = unstable_cache(
  async (userId: string, cursor?: string): Promise<FeedResponse> => {
    // Get user's bookmarked posts
    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: userId },
      take: ENTRIES_PER_PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { created_at: 'desc' },
      select: { post_id: true, id: true }
    })

    // Get processed sitemaps from Redis
    const sitemapPromises = bookmarks.slice(0, ENTRIES_PER_PAGE).map(async (bookmark) => {
      const key = `sitemap.${bookmark.post_id}.processed`
      const entries = await redis.get<FeedEntry[]>(key)
      return entries || []
    })

    const sitemaps = await Promise.all(sitemapPromises)
    const entries = sitemaps
      .flat()
      .filter((entry): entry is FeedEntry => {
        return Boolean(entry && entry.url && entry.meta && entry.meta.title && entry.meta.description && entry.meta.image && entry.lastmod)
      })
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())
      .slice(0, ENTRIES_PER_PAGE)

    // Get counts
    const urls = entries.map(entry => entry.url)
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

    // Add counts to entries
    const entriesWithCounts = entries.map(entry => ({
      ...entry,
      commentCount: commentCounts.find(c => c.url === entry.url)?._count.id || 0,
      likeCount: likeCounts.find(l => l.meta_url === entry.url)?._count.id || 0
    }))

    return {
      entries: entriesWithCounts,
      nextCursor: bookmarks.length > ENTRIES_PER_PAGE ? bookmarks[ENTRIES_PER_PAGE - 1].id : null
    }
  },
  ['feed-entries'],
  { revalidate: 60, tags: ['feed'] }
)

export default getFeedEntries 