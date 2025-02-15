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
    .replace(/^https?:\/\//, '')  // Remove protocol
    .replace(/^www\./, '')        // Remove www.
    .replace(/\.com$/, '')        // Remove .com
    .replace(/\.beehiiv$/, '')    // Remove .beehiiv
    .replace(/\/sitemap\.xml$/, '') // Remove /sitemap.xml
    .replace(/\/$/, '')           // Remove trailing slash
    .split('.')[0]                // Get first part of domain
  
  return {
    processed: `sitemap.${normalizedDomain}.processed`,
    raw: `sitemap.${normalizedDomain}.raw`
  }
}

// Helper function to process a single URL and merge with existing processed entries
async function processUrl(url: string): Promise<ProcessedResult> {
  try {
    const keys = getSitemapKeys(url)
    logger.info('Processing URL with keys:', { url, keys })
    
    // Get existing processed entries
    const processedEntries = await redis.get<SitemapEntry[]>(keys.processed) || []
    logger.info('Found processed entries:', { 
      url, 
      processedCount: processedEntries.length,
      processedKey: keys.processed
    })
    
    // Get raw XML entries
    const rawEntries = await redis.get<SitemapEntry[]>(keys.raw)
    let newEntries: SitemapEntry[] = []
    let totalRawEntries = 0

    // If raw cache doesn't exist or is expired, fetch fresh XML
    if (!rawEntries) {
      logger.info('No raw entries found, fetching fresh XML:', { url })
      let page = 1
      let hasMore = true
      const allRawEntries: SitemapEntry[] = []

      // Fetch all pages from this sitemap
      while (hasMore) {
        const result = await getSitemapPage(url, page)
        const entries = result.entries.map(entry => ({
          ...entry,
          sourceKey: url
        }))

        allRawEntries.push(...entries)
        hasMore = result.hasMore
        page++

        logger.info('Fetched sitemap page:', { 
          url, 
          page, 
          entriesCount: entries.length,
          hasMore 
        })

        // Add small delay between pages to prevent rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Sort raw entries chronologically before storing
      newEntries = sort(allRawEntries).desc(entry => new Date(entry.lastmod).getTime())
      totalRawEntries = allRawEntries.length
      
      // Store sorted raw entries with 24h TTL
      await redis.set(keys.raw, newEntries, { ex: 24 * 60 * 60 })
      logger.info('Stored chronologically sorted raw entries:', { 
        url, 
        count: newEntries.length,
        rawKey: keys.raw,
        firstEntryDate: newEntries[0]?.lastmod,
        lastEntryDate: newEntries[newEntries.length - 1]?.lastmod
      })
    } else {
      // Use cached raw entries (already sorted chronologically)
      newEntries = rawEntries
      totalRawEntries = rawEntries.length
      logger.info('Using cached raw entries:', { 
        url, 
        count: rawEntries.length,
        rawKey: keys.raw,
        firstEntryDate: rawEntries[0]?.lastmod,
        lastEntryDate: rawEntries[rawEntries.length - 1]?.lastmod
      })
    }

    // If we have processed entries, merge while maintaining chronological order
    if (processedEntries.length > 0) {
      // Create a Set of existing URLs for O(1) lookup
      const existingUrls = new Set(processedEntries.map(e => e.url))
      
      // Only add entries that don't exist in processed entries
      const uniqueNewEntries = newEntries.filter(entry => !existingUrls.has(entry.url))
      logger.info('Found unique new entries:', { 
        url, 
        uniqueCount: uniqueNewEntries.length,
        totalNew: newEntries.length,
        existing: processedEntries.length
      })
      
      // Combine existing and new entries
      const allEntries = [...processedEntries, ...uniqueNewEntries]
      
      // Re-sort all entries to maintain chronological order
      const sortedEntries = sort(allEntries).desc(entry => new Date(entry.lastmod).getTime())
      
      // Update the processed entries cache (persistent)
      await redis.set(keys.processed, sortedEntries)
      logger.info('Updated processed entries chronologically:', { 
        url, 
        totalCount: sortedEntries.length,
        processedKey: keys.processed,
        firstEntryDate: sortedEntries[0]?.lastmod,
        lastEntryDate: sortedEntries[sortedEntries.length - 1]?.lastmod
      })
      
      return {
        entries: sortedEntries,
        hasMore: false,
        total: totalRawEntries,
        nextCursor: null
      }
    } else {
      // For new sitemaps, entries are already sorted chronologically
      await redis.set(keys.processed, newEntries)
      logger.info('Stored new processed entries:', { 
        url, 
        count: newEntries.length,
        processedKey: keys.processed,
        firstEntryDate: newEntries[0]?.lastmod,
        lastEntryDate: newEntries[newEntries.length - 1]?.lastmod
      })
      
      return {
        entries: newEntries,
        hasMore: false,
        total: totalRawEntries,
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
    const itemsPerPage = 20
    const start = (page - 1) * itemsPerPage
    const end = start + itemsPerPage

    logger.info('Getting processed feed entries:', {
      processedUrlsCount: processedUrls.length,
      unprocessedUrlsCount: unprocessedUrls.length,
      page,
      start,
      end
    })

    // Get all raw entry counts first to know total
    const rawCounts = await Promise.all(
      [...processedUrls, ...unprocessedUrls].map(async (url) => {
        const keys = getSitemapKeys(url)
        const rawEntries = await redis.get<SitemapEntry[]>(keys.raw)
        return rawEntries?.length || 0
      })
    )
    const totalPossibleEntries = rawCounts.reduce((sum, count) => sum + count, 0)

    // Get all existing processed entries
    const processedResults = await Promise.all(
      processedUrls.map(async (url) => {
        const keys = getSitemapKeys(url)
        const entries = await redis.get<SitemapEntry[]>(keys.processed) || []
        return entries
      })
    )

    // Combine and sort all processed entries
    const allProcessedEntries = sort(processedResults.flat())
      .desc(entry => new Date(entry.lastmod).getTime())

    // If we have enough processed entries for this page, return them
    if (allProcessedEntries.length > end) {
      logger.info('Returning from processed entries cache:', {
        totalProcessed: allProcessedEntries.length,
        totalPossible: totalPossibleEntries,
        pageEntries: allProcessedEntries.slice(start, end).length
      })
      
      return {
        entries: allProcessedEntries.slice(start, end),
        hasMore: end < totalPossibleEntries,
        total: totalPossibleEntries,
        nextCursor: end < totalPossibleEntries ? page + 1 : null,
        currentPage: page
      }
    }

    // Process unprocessed URLs until we have enough entries for this page
    let processedCount = 0
    for (const url of unprocessedUrls) {
      if (allProcessedEntries.length >= end) break

      const result = await processUrl(url)
      allProcessedEntries.push(...result.entries)
      processedCount++

      // Re-sort entries after adding new ones
      sort(allProcessedEntries).desc(entry => new Date(entry.lastmod).getTime())

      logger.info('Processed additional sitemap:', {
        url,
        newEntriesCount: result.entries.length,
        totalProcessed: allProcessedEntries.length,
        targetCount: end,
        totalPossible: totalPossibleEntries
      })
    }

    // Get entries for current page
    const paginatedEntries = allProcessedEntries.slice(start, end)

    logger.info('Returning paginated entries:', {
      page,
      start,
      end,
      paginatedCount: paginatedEntries.length,
      totalProcessed: allProcessedEntries.length,
      totalPossible: totalPossibleEntries,
      remainingUnprocessed: unprocessedUrls.length - processedCount
    })

    return {
      entries: paginatedEntries,
      hasMore: end < totalPossibleEntries,
      total: totalPossibleEntries,
      nextCursor: end < totalPossibleEntries ? page + 1 : null,
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