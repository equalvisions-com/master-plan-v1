import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import { redis } from '@/lib/redis/client'

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

async function getProcessedSitemapKey(sitemapUrl: string) {
  const url = new URL(sitemapUrl)
  const hostname = url.hostname.toLowerCase()
  const domain = hostname
    .replace(/^www\./, '') // Remove www.
    .split('.')[0] // Get first part of domain
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special chars
  return `sitemap.${domain}.processed`
}

async function processSitemap(sitemapUrl: string, page = 1) {
  const processedKey = await getProcessedSitemapKey(sitemapUrl)
  
  logger.info('Processing sitemap page', { url: sitemapUrl, page })
  
  // Let getSitemapPage handle the raw sitemap caching
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

  // Get existing processed entries
  const existingEntries = await redis.get<SitemapEntry[]>(processedKey) || []
  
  // Merge new entries with existing ones
  const mergedEntries = mergeEntriesChronologically(existingEntries, entries)
  
  // Update cache with merged entries
  await redis.set(processedKey, mergedEntries)

  return { 
    entries,
    hasMore: result.hasMore,
    total: result.total,
    redisKey: processedKey
  }
}

// Helper function to merge entries in chronological order
function mergeEntriesChronologically(entries1: SitemapEntry[], entries2: SitemapEntry[]): SitemapEntry[] {
  const urlSet = new Set<string>()
  return [...entries1, ...entries2]
    .filter(entry => {
      if (urlSet.has(entry.url)) return false
      urlSet.add(entry.url)
      return true
    })
    .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())
}

// Function to handle multiple sitemaps for the feed
export async function getProcessedFeedEntries(sitemapUrls: string[], cursor = 0, limit = 10) {
  try {
    // First get all cached processed entries
    const processedKeys = await Promise.all(sitemapUrls.map(getProcessedSitemapKey))
    const cachedResults = await Promise.all(
      processedKeys.map(async (key, index) => {
        const entries = await redis.get<SitemapEntry[]>(key) || []
        // Process sitemap to check if it has more entries
        const result = await getSitemapPage(sitemapUrls[index], Math.ceil(entries.length / limit) + 1)
        return {
          entries,
          url: sitemapUrls[index],
          key,
          hasProcessedAll: entries.length > 0 && !result.hasMore
        }
      })
    )

    // Get all processed entries in chronological order
    const processedEntries = cachedResults
      .flatMap(r => r.entries)
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    logger.info('Feed: Processed entries', { count: processedEntries.length })

    // Calculate if we need more entries based on cursor and limit
    const remainingEntries = processedEntries.length - cursor
    const needsMoreEntries = remainingEntries < limit

    if (needsMoreEntries) {
      logger.info('Feed: Need more entries, processing next pages', {
        current: processedEntries.length,
        needed: limit,
        remaining: remainingEntries
      })

      // Only process sitemaps that aren't fully processed
      const sitemapsToProcess = cachedResults
        .filter(result => !result.hasProcessedAll)
        .map(result => result.url)

      logger.info('Feed: Processing sitemaps', {
        total: sitemapUrls.length,
        needProcessing: sitemapsToProcess.length
      })

      // Process next page for unprocessed sitemaps
      const newResults = await Promise.all(
        sitemapsToProcess.map(async (url) => {
          try {
            const page = Math.floor(cursor / limit) + 1
            const result = await processSitemap(url, page)
            return result.entries
          } catch (error) {
            logger.error('Error processing sitemap', { url, error })
            return []
          }
        })
      )

      // Merge all new entries with existing ones
      const newEntries = newResults.flat()
      const allEntries = mergeEntriesChronologically(processedEntries, newEntries)

      logger.info('Feed: Added more entries', {
        previous: processedEntries.length,
        new: newEntries.length,
        total: allEntries.length
      })

      // Apply pagination
      const paginatedEntries = allEntries.slice(cursor, cursor + limit)
      const hasMore = allEntries.length > cursor + limit || sitemapsToProcess.length > 0

      return {
        entries: paginatedEntries,
        nextCursor: hasMore ? cursor + limit : null,
        hasMore,
        total: allEntries.length
      }
    }

    // If we have enough entries, just paginate the existing ones
    const paginatedEntries = processedEntries.slice(cursor, cursor + limit)
    const hasMore = processedEntries.length > cursor + limit

    logger.info('Feed: Returning paginated entries', {
      page: Math.floor(cursor / limit) + 1,
      pageSize: limit,
      returnedEntries: paginatedEntries.length,
      totalEntries: processedEntries.length,
      hasMore
    })

    return {
      entries: paginatedEntries,
      nextCursor: hasMore ? cursor + limit : null,
      hasMore,
      total: processedEntries.length
    }
  } catch (error) {
    logger.error('Feed Redis fetch error', { error })
    return { entries: [], nextCursor: null, hasMore: false, total: 0 }
  }
} 