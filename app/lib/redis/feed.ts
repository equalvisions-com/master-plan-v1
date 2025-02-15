import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import { sort } from 'fast-sort'
import { redis } from '@/lib/redis/client'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import type { ProcessedResult, PaginationResult, SitemapEntry } from '@/app/types/feed'

// Helper function to get Redis keys for a sitemap URL
function getSitemapKeys(url: string) {
  // Strip protocol, www, and .com to match existing key structure
  // e.g., https://bensbites.beehiiv.com/sitemap.xml -> sitemap.bensbites
  const normalizedDomain = normalizeUrl(url)
    .replace(/sitemap\.xml$/, '')
    .replace(/\/$/, '')
  
  return {
    processed: `sitemap.${normalizedDomain}.processed`,
    raw: `sitemap.${normalizedDomain}.raw`
  }
}

// Helper function to process a single URL and merge with existing processed entries
async function processUrl(url: string): Promise<ProcessedResult> {
  try {
    const keys = getSitemapKeys(url)
    
    // Get existing processed entries
    const processedEntries = await redis.get<SitemapEntry[]>(keys.processed) || []
    
    // Get raw XML entries
    const rawEntries = await redis.get<SitemapEntry[]>(keys.raw)
    let newEntries: SitemapEntry[] = []

    // If raw cache doesn't exist or is expired, fetch fresh XML
    if (!rawEntries) {
      let page = 1
      let hasMore = true

      // Fetch all pages from this sitemap
      while (hasMore) {
        const result = await getSitemapPage(url, page)
        const entries = result.entries.map(entry => ({
          ...entry,
          sourceKey: url
        }))

        newEntries.push(...entries)
        hasMore = result.hasMore
        page++

        // Add small delay between pages to prevent rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Store raw entries with 24h TTL
      await redis.set(keys.raw, newEntries, { ex: 24 * 60 * 60 })
    } else {
      // Use cached raw entries
      newEntries = rawEntries
    }

    // If we have processed entries, merge chronologically
    if (processedEntries.length > 0) {
      // Create a Set of existing URLs for O(1) lookup
      const existingUrls = new Set(processedEntries.map(e => e.url))
      
      // Only add entries that don't exist in processed entries
      const uniqueNewEntries = newEntries.filter(entry => !existingUrls.has(entry.url))
      
      // Combine existing and new entries
      const allEntries = [...processedEntries, ...uniqueNewEntries]
      
      // Sort all entries by date
      const sortedEntries = sort(allEntries).desc(entry => new Date(entry.lastmod).getTime())
      
      // Update the processed entries cache (persistent)
      await redis.set(keys.processed, sortedEntries)
      
      return {
        entries: sortedEntries,
        hasMore: false,
        total: sortedEntries.length,
        nextCursor: null
      }
    } else {
      // For new sitemaps, sort and store all entries
      const sortedEntries = sort(newEntries).desc(entry => new Date(entry.lastmod).getTime())
      await redis.set(keys.processed, sortedEntries)
      
      return {
        entries: sortedEntries,
        hasMore: false,
        total: sortedEntries.length,
        nextCursor: null
      }
    }
  } catch (error) {
    logger.error('Error processing URL:', { url, error })
    return { entries: [], hasMore: false, total: 0, nextCursor: null }
  }
}

export async function getProcessedFeedEntries(
  processedUrls: string[], 
  unprocessedUrls: string[],
  page: number
): Promise<PaginationResult> {
  try {
    // Process all URLs concurrently - no need to differentiate between processed/unprocessed
    // since we'll check the cache status for each URL
    const allResults = await Promise.all([...processedUrls, ...unprocessedUrls].map(processUrl))

    // Combine all entries from all sitemaps
    const allEntries = allResults.flatMap(r => r.entries)
    const totalEntries = allEntries.length
    
    // Sort all entries by date using fast-sort
    const sortedEntries = sort(allEntries).desc(entry => new Date(entry.lastmod).getTime())

    // Calculate pagination
    const itemsPerPage = 20
    const start = (page - 1) * itemsPerPage
    const end = start + itemsPerPage
    
    // Get entries for current page
    const paginatedEntries = sortedEntries.slice(start, end)
    
    // We have more if there are entries after the current page
    const hasMore = end < totalEntries

    return {
      entries: paginatedEntries,
      hasMore,
      total: totalEntries,
      nextCursor: hasMore ? page + 1 : null,
      currentPage: page
    }
  } catch (error) {
    logger.error('Error in getProcessedFeedEntries:', error)
    return { 
      entries: [], 
      hasMore: false, 
      total: 0, 
      nextCursor: null,
      currentPage: page
    }
  }
} 