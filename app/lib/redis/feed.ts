import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import { unstable_cache } from 'next/cache'

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

const BATCH_SIZE = 3 // Process 3 sitemaps at a time
const ENTRIES_PER_PAGE = 50 // Fetch more entries per page to reduce API calls

// Cache the processed sitemap key generation
const getProcessedSitemapKey = unstable_cache(
  async (sitemapUrl: string) => {
    const hostname = new URL(sitemapUrl).hostname
    const domain = hostname.replace(/^www\./, '').split('.')[0]
    return `sitemap.${domain}.processed`
  },
  ['processed-sitemap-key'],
  { revalidate: 3600 } // Cache for 1 hour
)

// Process a batch of sitemaps in parallel
async function processSitemapBatch(sitemaps: string[], page = 1) {
  const results = await Promise.all(
    sitemaps.map(async (url) => {
      try {
        const processedKey = await getProcessedSitemapKey(url)
        logger.info('Processing sitemap page', { url, page })
        
        // Fetch more entries per page
        const result = await getSitemapPage(url, page, ENTRIES_PER_PAGE)
        
        if (!result.entries.length) {
          logger.warn('No entries found in sitemap page', { url, page })
          return { entries: [], hasMore: false, url }
        }

        const entries = result.entries.map(entry => ({
          ...entry,
          sourceKey: processedKey
        }))

        // Cache the entries
        const existing = await redis.get<SitemapEntry[]>(processedKey) || []
        const merged = mergeEntriesChronologically(existing, entries)
        await redis.set(processedKey, merged)

        return { entries, hasMore: result.hasMore, url }
      } catch (error) {
        logger.error('Error processing sitemap', { url, error })
        return { entries: [], hasMore: false, url }
      }
    })
  )

  return results
}

// Helper function to merge entries in chronological order
function mergeEntriesChronologically(entries1: SitemapEntry[], entries2: SitemapEntry[]): SitemapEntry[] {
  return [...entries1, ...entries2].sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())
}

// Function to handle multiple sitemaps for the feed
export async function getProcessedFeedEntries(sitemapUrls: string[], cursor = 0, limit = 10) {
  try {
    // First get all cached entries in parallel
    const processedKeys = await Promise.all(sitemapUrls.map(getProcessedSitemapKey))
    const cachedResults = await Promise.all(
      processedKeys.map(async (key, index) => {
        const entries = await redis.get<SitemapEntry[]>(key) || []
        return {
          entries,
          url: sitemapUrls[index],
          key,
          hasMore: true
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

    // Get all processed entries
    let allEntries = hasProcessed
      .flatMap(r => r.entries)
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    // Process unprocessed sitemaps in batches
    const unprocessedUrls = needsProcessing.map(r => r.url)
    for (let i = 0; i < unprocessedUrls.length; i += BATCH_SIZE) {
      const batch = unprocessedUrls.slice(i, i + BATCH_SIZE)
      const results = await processSitemapBatch(batch)
      
      // Merge new entries
      const newEntries = results.flatMap(r => r.entries)
      allEntries = mergeEntriesChronologically(allEntries, newEntries)
    }

    // Calculate if we need more entries
    const neededEntries = cursor + limit
    let currentPage = 1

    // Keep processing more pages in batches until we have enough entries
    while (allEntries.length < neededEntries) {
      currentPage++
      let hasNewEntries = false

      // Process sitemaps in batches
      for (let i = 0; i < sitemapUrls.length; i += BATCH_SIZE) {
        const batch = sitemapUrls.slice(i, i + BATCH_SIZE)
        const results = await processSitemapBatch(batch, currentPage)
        
        const newEntries = results.flatMap(r => r.entries)
        if (newEntries.length > 0) {
          hasNewEntries = true
          allEntries = mergeEntriesChronologically(allEntries, newEntries)
        }
      }

      if (!hasNewEntries) break
    }

    if (!allEntries.length) {
      logger.warn('Feed: No entries found in any sitemaps')
      return { entries: [], nextCursor: null, hasMore: false, total: 0 }
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