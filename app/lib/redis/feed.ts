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

export async function getProcessedSitemapEntries(sitemapUrl: string, cursor = 0, limit = 10) {
  try {
    // Get processed sitemap key - match the exact format used in SitemapMetaPreview
    const hostname = new URL(sitemapUrl).hostname
    const domain = hostname.replace(/^www\./, '').split('.')[0]
    const redisKey = `sitemap.${domain}.processed`
    
    console.log('Fetching Redis key:', redisKey)
    
    // Fetch entries for this sitemap
    const entries = await redis.get<SitemapEntry[]>(redisKey) || []
    console.log(`Fetched ${redisKey}:`, entries.length, 'entries')

    // Sort by date
    const sortedEntries = entries
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())
      .map(entry => ({
        ...entry,
        sourceKey: redisKey
      }))

    // Apply pagination
    const paginatedEntries = sortedEntries.slice(cursor, cursor + limit)
    const hasMore = sortedEntries.length > cursor + limit

    return {
      entries: paginatedEntries,
      nextCursor: hasMore ? cursor + limit : null,
      hasMore,
      total: sortedEntries.length
    }
  } catch (error) {
    console.error('Redis fetch error:', error)
    return { entries: [], nextCursor: null, hasMore: false, total: 0 }
  }
}

// New function to handle multiple sitemaps for the feed
export async function getProcessedFeedEntries(sitemapUrls: string[], cursor = 0, limit = 10) {
  try {
    // Get all processed sitemap keys
    const redisKeys = sitemapUrls.map(url => {
      const hostname = new URL(url).hostname
      const domain = hostname.replace(/^www\./, '').split('.')[0]
      return `sitemap.${domain}.processed`
    })
    
    console.log('Fetching Redis keys:', redisKeys)
    
    // Fetch all sitemaps in parallel
    const results = await Promise.all(
      redisKeys.map(async (key) => {
        const data = await redis.get<SitemapEntry[]>(key)
        console.log(`Fetched ${key}:`, data ? data.length : 0, 'entries')
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

    console.log('Total merged entries:', allEntries.length)

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