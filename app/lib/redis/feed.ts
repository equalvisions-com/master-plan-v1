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
    let processedEntries = await redis.get<SitemapEntry[]>(keys.processed)
    processedEntries = Array.isArray(processedEntries) ? processedEntries : []
    
    logger.info('Found processed entries:', { 
      url, 
      processedCount: processedEntries.length,
      processedKey: keys.processed
    })
    
    // Get raw XML entries
    let rawEntries = await redis.get<SitemapEntry[]>(keys.raw)
    let newEntries: SitemapEntry[] = []

    // If raw cache doesn't exist or is expired, fetch fresh XML
    if (!rawEntries || !Array.isArray(rawEntries)) {
      logger.info('No raw entries found, fetching fresh XML:', { url })
      let page = 1
      let hasMore = true
      const allRawEntries: SitemapEntry[] = []

      // Fetch all pages from this sitemap
      while (hasMore) {
        const result = await getSitemapPage(url, page)
        if (!result || !Array.isArray(result.entries)) {
          logger.warn('Invalid sitemap page result:', { url, page, result })
          break
        }

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
      
      // Store sorted raw entries with 24h TTL
      if (newEntries.length > 0) {
        await redis.set(keys.raw, newEntries, { ex: 24 * 60 * 60 })
        logger.info('Stored chronologically sorted raw entries:', { 
          url, 
          count: newEntries.length,
          rawKey: keys.raw,
          firstEntryDate: newEntries[0]?.lastmod,
          lastEntryDate: newEntries[newEntries.length - 1]?.lastmod
        })
      }
    } else {
      newEntries = rawEntries
      logger.info('Using cached raw entries:', { 
        url, 
        count: rawEntries.length,
        rawKey: keys.raw,
        firstEntryDate: rawEntries[0]?.lastmod,
        lastEntryDate: rawEntries[newEntries.length - 1]?.lastmod
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
        total: sortedEntries.length,
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
        total: newEntries.length,
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

    // Get raw entries from all sitemaps for the current page
    const allEntries: SitemapEntry[] = []
    const allUrls = [...processedUrls, ...unprocessedUrls]
    
    for (const url of allUrls) {
      const keys = getSitemapKeys(url)
      
      // Try to get processed entries first
      let entries = await redis.get<SitemapEntry[]>(keys.processed)
      
      // If no processed entries, get and process raw entries
      if (!entries || !Array.isArray(entries)) {
        const rawEntries = await redis.get<SitemapEntry[]>(keys.raw)
        
        if (!rawEntries || !Array.isArray(rawEntries)) {
          // Fetch and process new entries from sitemap
          logger.info('Fetching new entries from sitemap:', { url })
          const result = await processUrl(url)
          entries = result.entries
        } else {
          entries = rawEntries
        }
      }

      if (Array.isArray(entries) && entries.length > 0) {
        allEntries.push(...entries)
      }

      // Sort after each addition to maintain chronological order
      sort(allEntries).desc(entry => new Date(entry.lastmod).getTime())

      // If we have enough entries for this page, we can stop
      if (allEntries.length >= end) {
        break
      }
    }

    // Get entries for current page
    const paginatedEntries = allEntries.slice(start, end)
    
    // We have more entries if:
    // 1. We have more entries beyond this page
    // 2. We haven't processed all URLs yet
    const hasMoreEntries = allEntries.length > end
    const hasMoreUrls = allUrls.length > allUrls.indexOf(allUrls.find(url => {
      const keys = getSitemapKeys(url)
      return !redis.get(keys.processed)
    }) || '') + 1

    logger.info('Returning paginated entries:', {
      page,
      start,
      end,
      paginatedCount: paginatedEntries.length,
      totalProcessed: allEntries.length,
      hasMoreEntries,
      hasMoreUrls
    })

    return {
      entries: paginatedEntries,
      hasMore: hasMoreEntries || hasMoreUrls,
      total: allEntries.length, // This will update as we process more
      nextCursor: (hasMoreEntries || hasMoreUrls) ? page + 1 : null,
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