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
    // Get all processed sitemap keys - match the exact format: sitemap.domain.processed
    const redisKeys = sitemapUrls.map(url => {
      const hostname = new URL(url).hostname
      const domain = hostname.replace(/^www\./, '').split('.')[0] // Get just the domain name part
      return `sitemap.${domain}.processed`
    })
    
    console.log('Fetching Redis keys:', redisKeys) // Debug log
    
    // Fetch all sitemaps in parallel
    const results = await Promise.all(
      redisKeys.map(async (key) => {
        const data = await redis.get<SitemapEntry[]>(key)
        console.log(`Fetched ${key}:`, data ? data.length : 0, 'entries') // Debug log
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

    console.log('Total merged entries:', allEntries.length) // Debug log

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