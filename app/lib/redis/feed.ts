import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

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
    
    logger.info('Fetching Redis key', { key: redisKey })
    
    // Fetch entries for this sitemap
    const entries = await redis.get<SitemapEntry[]>(redisKey) || []
    logger.info('Fetched entries', { key: redisKey, count: entries.length })

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
    logger.error('Redis fetch error', { error })
    return { entries: [], nextCursor: null, hasMore: false, total: 0 }
  }
}

// Function to handle multiple sitemaps for the feed
export async function getProcessedFeedEntries(sitemapUrls: string[], cursor = 0, limit = 10) {
  try {
    // Get all processed sitemap keys
    const redisKeys = sitemapUrls.map(url => {
      const hostname = new URL(url).hostname
      const domain = hostname.replace(/^www\./, '').split('.')[0]
      return `sitemap.${domain}.processed`
    })
    
    logger.info('Feed: Fetching Redis keys', { keys: redisKeys })
    
    // Fetch all sitemaps in parallel and track individual counts
    const results = await Promise.all(
      redisKeys.map(async (key) => {
        const data = await redis.get<SitemapEntry[]>(key)
        const count = data?.length || 0
        logger.info('Feed: Fetched entries', { key, count })
        return {
          entries: data || [],
          key,
          count
        }
      })
    )

    // Log individual sitemap counts
    results.forEach(({ key, count }) => {
      logger.info('Feed: Sitemap entries', { key, count })
    })

    // Merge all entries and sort by date
    const allEntries = results
      .flatMap(result => 
        result.entries.map(entry => ({
          ...entry,
          sourceKey: result.key
        }))
      )
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    logger.info('Feed: Total merged entries', { count: allEntries.length })

    // Apply pagination after merging all entries
    const paginatedEntries = allEntries.slice(cursor, cursor + limit)
    const hasMore = allEntries.length > cursor + limit

    logger.info('Feed: Returning paginated entries', {
      page: Math.floor(cursor / limit) + 1,
      pageSize: limit,
      returnedEntries: paginatedEntries.length,
      totalEntries: allEntries.length,
      hasMore
    })

    return {
      entries: paginatedEntries,
      nextCursor: hasMore ? cursor + limit : null,
      hasMore,
      total: allEntries.length
    }
  } catch (error) {
    logger.error('Feed Redis fetch error', { error })
    return { entries: [], nextCursor: null, hasMore: false, total: 0 }
  }
} 