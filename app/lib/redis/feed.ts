import { Redis } from '@upstash/redis'

interface SitemapEntry {
  url: string
  meta: {
    title: string
    description: string
    image?: string
  }
  lastmod: string
  sourceKey: string
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export async function getProcessedSitemapEntries(sitemapUrls: string[], cursor = 0, limit = 10) {
  try {
    // Get all processed sitemap keys
    const redisKeys = sitemapUrls.map(url => `sitemap.${new URL(url).hostname}.processed`)
    
    // Fetch all sitemaps in parallel
    const results = await Promise.all(
      redisKeys.map(async (key) => {
        const data = await redis.get<SitemapEntry[]>(key)
        return (data || []).map(entry => ({
          ...entry,
          sourceKey: key
        }))
      })
    )

    // Merge all entries and sort by date
    const allEntries = results
      .flat()
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    // Apply pagination
    const paginatedEntries = allEntries.slice(cursor, cursor + limit)
    const hasMore = allEntries.length > cursor + limit

    return {
      entries: paginatedEntries,
      nextCursor: hasMore ? cursor + limit : null,
      hasMore,
      total: allEntries.length
    }
  } catch (error) {
    console.error('Redis fetch error:', error)
    return { entries: [], nextCursor: null, hasMore: false, total: 0 }
  }
} 