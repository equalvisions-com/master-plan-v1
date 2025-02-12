import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'

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

async function getProcessedSitemapKey(sitemapUrl: string) {
  const hostname = new URL(sitemapUrl).hostname
  const domain = hostname.replace(/^www\./, '').split('.')[0]
  return `sitemap.${domain}.processed`
}

async function processSitemap(sitemapUrl: string, page = 1) {
  const processedKey = await getProcessedSitemapKey(sitemapUrl)
  
  logger.info('Processing sitemap page', { url: sitemapUrl, page })
  
  // getSitemapPage will handle fetching and caching the raw sitemap
  const result = await getSitemapPage(sitemapUrl, page)
  
  if (!result.entries.length) {
    logger.warn('No entries found in sitemap page', { url: sitemapUrl, page })
    return { entries: [], hasMore: false, total: 0, redisKey: processedKey }
  }

  // Add sourceKey to entries
  const entries = result.entries.map(entry => ({
    ...entry,
    sourceKey: processedKey
  }))

  return { 
    entries,
    hasMore: result.hasMore,
    total: result.total,
    redisKey: processedKey
  }
}

// Helper function to merge entries in chronological order
function mergeEntriesChronologically(entries1: SitemapEntry[], entries2: SitemapEntry[]): SitemapEntry[] {
  return [...entries1, ...entries2].sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())
}

// Function to handle multiple sitemaps for the feed
export async function getProcessedFeedEntries(sitemapUrls: string[], cursor = 0, limit = 10) {
  try {
    // First get all cached processed entries
    const processedKeys = await Promise.all(sitemapUrls.map(getProcessedSitemapKey))
    const cachedResults = await Promise.all(
      processedKeys.map(async (key, index) => {
        const entries = await redis.get<SitemapEntry[]>(key) || []
        return {
          entries,
          url: sitemapUrls[index],
          key
        }
      })
    )

    // Find which sitemaps need processing
    const needsProcessing = cachedResults.filter(result => !result.entries.length)
    const hasProcessed = cachedResults.filter(result => result.entries.length > 0)

    logger.info('Feed: Cache status', {
      total: sitemapUrls.length,
      cached: hasProcessed.length,
      needsProcessing: needsProcessing.length
    })

    // Get all processed entries in chronological order
    const processedEntries = hasProcessed
      .flatMap(r => r.entries)
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    logger.info('Feed: Processed entries', { count: processedEntries.length })

    // Process unprocessed sitemaps in parallel
    const newResults = await Promise.all(
      needsProcessing.map(async ({ url, key }) => {
        try {
          const result = await processSitemap(url)
          
          // Cache the new entries
          await redis.set(key, result.entries)
          
          logger.info('Feed: Processed new sitemap', { 
            url,
            entries: result.entries.length,
            hasMore: result.hasMore
          })
          
          return result.entries
        } catch (error) {
          logger.error('Error processing sitemap', { url, error })
          return []
        }
      })
    )

    // Get all new entries in chronological order
    const newEntries = newResults
      .flat()
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    logger.info('Feed: New entries', { count: newEntries.length })

    // Merge processed and new entries in chronological order
    const allEntries = mergeEntriesChronologically(processedEntries, newEntries)

    logger.info('Feed: Total merged entries', { count: allEntries.length })

    if (!allEntries.length) {
      logger.warn('Feed: No entries found in any sitemaps')
      return { entries: [], nextCursor: null, hasMore: false, total: 0 }
    }

    // Check if we need to process more entries
    const remainingEntries = allEntries.length - cursor
    if (remainingEntries < limit && needsProcessing.length > 0) {
      logger.info('Feed: Need more entries, processing next pages', {
        current: allEntries.length,
        needed: limit,
        remaining: remainingEntries
      })

      // Process next page for sitemaps that need it
      const nextPageResults = await Promise.all(
        needsProcessing.map(async ({ url, key }) => {
          try {
            const page = Math.floor(cursor / limit) + 1
            const result = await processSitemap(url, page)
            
            // Get existing entries and merge with new ones chronologically
            const existing = await redis.get<SitemapEntry[]>(key) || []
            const merged = mergeEntriesChronologically(existing, result.entries)
            
            // Update cache
            await redis.set(key, merged)
            
            return result.entries
          } catch (error) {
            logger.error('Error processing next page', { url, error })
            return []
          }
        })
      )

      // Get new page entries in chronological order
      const nextPageEntries = nextPageResults
        .flat()
        .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

      // Merge with existing entries chronologically
      const mergedEntries = mergeEntriesChronologically(allEntries, nextPageEntries)

      logger.info('Feed: Added more entries', {
        previous: allEntries.length,
        new: nextPageEntries.length,
        total: mergedEntries.length
      })

      // Update allEntries with merged results
      allEntries.length = 0
      allEntries.push(...mergedEntries)
    }

    // Apply pagination
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