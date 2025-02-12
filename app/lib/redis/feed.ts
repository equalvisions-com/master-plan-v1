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

export async function getProcessedSitemapEntries(sitemapKeys: string[], cursor = 0, limit = 10) {
  try {
    const entries: SitemapEntry[] = []
    const currentCursor = cursor
    let hasMore = false

    for (const key of sitemapKeys) {
      const data = await redis.get<SitemapEntry[]>(key)
      if (data && Array.isArray(data)) {
        entries.push(...data.map(entry => ({
          ...entry,
          sourceKey: key
        })))
      }
    }

    // Sort by date
    entries.sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    // Apply pagination
    const paginatedEntries = entries.slice(currentCursor, currentCursor + limit)
    hasMore = entries.length > currentCursor + limit

    return {
      entries: paginatedEntries,
      nextCursor: hasMore ? currentCursor + limit : null,
      hasMore
    }
  } catch (error) {
    console.error('Redis fetch error:', error)
    return { entries: [], nextCursor: null, hasMore: false }
  }
} 