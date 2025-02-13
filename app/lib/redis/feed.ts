import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
import { getSitemapPage, getRawSitemapInfo } from '../sitemap/sitemap-service'
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

interface SitemapInfo {
  totalEntries: number
  processedPages: number
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

const BATCH_SIZE = 10 // Process 10 sitemaps at a time
const ENTRIES_PER_PAGE = 10 // Fetch 10 entries per page to match pagination

// Cache the processed sitemap key generation
const getProcessedSitemapKey = unstable_cache(
  async (sitemapUrl: string) => {
    const hostname = new URL(sitemapUrl).hostname
    const domain = hostname.replace(/^www\./, '').split('.')[0]
    return `sitemap.${domain}.processed`
  },
  ['processed-sitemap-key'],
  { revalidate: 3600 }
)

// Get sitemap info key
async function getSitemapInfoKey(sitemapUrl: string) {
  const hostname = new URL(sitemapUrl).hostname
  const domain = hostname.replace(/^www\./, '').split('.')[0]
  return `sitemap.${domain}.info`
}

// Helper function to get UTC timestamp
function getUTCTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime()
}

// Helper function to merge entries in chronological order
function mergeEntriesChronologically(entries1: SitemapEntry[], entries2: SitemapEntry[]): SitemapEntry[] {
  const uniqueEntries = new Map<string, SitemapEntry>()
  
  ;[...entries1, ...entries2].forEach(entry => {
    const existing = uniqueEntries.get(entry.url)
    if (!existing || getUTCTimestamp(entry.lastmod) > getUTCTimestamp(existing.lastmod)) {
      uniqueEntries.set(entry.url, {
        ...entry,
        lastmod: new Date(entry.lastmod).toISOString() // Ensure UTC ISO string format
      })
    }
  })
  
  return Array.from(uniqueEntries.values())
    .sort((a, b) => getUTCTimestamp(b.lastmod) - getUTCTimestamp(a.lastmod))
}

// Process a batch of sitemaps in parallel
async function processSitemapBatch(sitemaps: string[], page = 1, processedUrls = new Set<string>()) {
  const results = await Promise.all(
    sitemaps.map(async (url) => {
      try {
        const processedKey = await getProcessedSitemapKey(url)
        logger.info('Processing sitemap page', { url, page })
        
        // Skip if we've already processed this URL for this page
        const cacheKey = `${url}:${page}`
        if (processedUrls.has(cacheKey)) {
          logger.info('Skipping already processed sitemap page', { url, page })
          return { entries: [], hasMore: false, url }
        }
        processedUrls.add(cacheKey)
        
        // Get raw sitemap info first
        const rawInfo = await getRawSitemapInfo(url)
        const processedEntries = await redis.get<SitemapEntry[]>(processedKey) || []
        
        // Check if we need to process more entries
        const hasMore = processedEntries.length < rawInfo.totalEntries
        if (!hasMore) {
          logger.info('All entries already processed', { 
            url, 
            processed: processedEntries.length,
            total: rawInfo.totalEntries 
          })
          return { entries: [], hasMore: false, url }
        }
        
        // Process next page
        const result = await getSitemapPage(url, page, ENTRIES_PER_PAGE)
        
        if (!result.entries.length) {
          logger.warn('No entries found in sitemap page', { url, page })
          return { entries: [], hasMore: false, url }
        }

        const entries = result.entries.map(entry => ({
          ...entry,
          sourceKey: processedKey
        }))

        // Merge and cache the entries
        const merged = mergeEntriesChronologically(processedEntries, entries)
        await redis.set(processedKey, merged)

        // Check if we need more entries based on raw sitemap
        const stillHasMore = merged.length < rawInfo.totalEntries

        logger.info('Processed sitemap page', {
          url,
          page,
          newEntries: entries.length,
          totalProcessed: merged.length,
          totalAvailable: rawInfo.totalEntries,
          hasMore: stillHasMore
        })

        return { entries, hasMore: stillHasMore, url }
      } catch (error) {
        logger.error('Error processing sitemap', { url, error })
        return { entries: [], hasMore: false, url }
      }
    })
  )

  return results
}

// Function to handle multiple sitemaps for the feed
export async function getProcessedFeedEntries(sitemapUrls: string[], cursor = 0, limit = 10) {
  try {
    // Track processed URLs to prevent duplicates
    const processedUrls = new Set<string>()
    
    // Get raw sitemap info and processed entries for all URLs
    const sitemapsInfo = await Promise.all(
      sitemapUrls.map(async (url) => {
        const rawInfo = await getRawSitemapInfo(url)
        const processedKey = await getProcessedSitemapKey(url)
        const entries = await redis.get<SitemapEntry[]>(processedKey) || []
        
        return {
          url,
          entries,
          processedCount: entries.length,
          totalAvailable: rawInfo.totalEntries,
          hasMore: entries.length < rawInfo.totalEntries
        }
      })
    )

    logger.info('Feed: Initial status', {
      total: sitemapsInfo.length,
      processed: sitemapsInfo.map(s => ({
        url: s.url,
        processed: s.processedCount,
        total: s.totalAvailable
      }))
    })

    // Get all processed entries
    let allEntries = sitemapsInfo
      .flatMap(s => s.entries)
      .sort((a, b) => getUTCTimestamp(b.lastmod) - getUTCTimestamp(a.lastmod))

    // Calculate if we need more entries
    const neededEntries = cursor + limit
    let currentPage = Math.floor(allEntries.length / ENTRIES_PER_PAGE) + 1

    // Keep processing until we have enough entries or no more available
    while (allEntries.length < neededEntries) {
      // Find sitemaps that need more processing
      const needsMore = sitemapsInfo.filter(s => s.hasMore)
      if (needsMore.length === 0) break

      logger.info('Feed: Processing more entries', {
        current: allEntries.length,
        needed: neededEntries,
        page: currentPage,
        sitesWithMore: needsMore.length
      })

      // Process next page for sitemaps in parallel batches
      for (let i = 0; i < needsMore.length; i += BATCH_SIZE) {
        const batch = needsMore.slice(i, i + BATCH_SIZE).map(s => s.url)
        const results = await processSitemapBatch(batch, currentPage, processedUrls)
        
        // Update sitemapsInfo with new status
        results.forEach(result => {
          const sitemapInfo = sitemapsInfo.find(s => s.url === result.url)
          if (sitemapInfo) {
            sitemapInfo.hasMore = result.hasMore
            if (result.entries.length > 0) {
              sitemapInfo.entries = result.entries
              sitemapInfo.processedCount += result.entries.length
            }
          }
        })

        const newEntries = results.flatMap(r => r.entries)
        if (newEntries.length > 0) {
          allEntries = mergeEntriesChronologically(allEntries, newEntries)
          
          logger.info('Feed: Added more entries', {
            newCount: newEntries.length,
            totalCount: allEntries.length,
            fromPage: currentPage
          })
        }
      }

      currentPage++
    }

    if (!allEntries.length) {
      logger.warn('Feed: No entries found in any sitemaps')
      return { entries: [], nextCursor: null, hasMore: false, total: 0 }
    }

    // Get total available entries from raw sitemaps
    const totalAvailable = sitemapsInfo.reduce((total, info) => 
      total + info.totalAvailable, 0)

    // Apply pagination
    const paginatedEntries = allEntries.slice(cursor, cursor + limit)
    const hasMore = allEntries.length < totalAvailable || allEntries.length > cursor + limit

    logger.info('Feed: Returning paginated entries', {
      page: Math.floor(cursor / limit) + 1,
      pageSize: limit,
      returnedEntries: paginatedEntries.length,
      totalProcessed: allEntries.length,
      totalAvailable,
      hasMore
    })

    return {
      entries: paginatedEntries,
      nextCursor: hasMore ? cursor + limit : null,
      hasMore,
      total: totalAvailable
    }
  } catch (error) {
    logger.error('Feed Redis fetch error', { error })
    return { entries: [], nextCursor: null, hasMore: false, total: 0 }
  }
} 