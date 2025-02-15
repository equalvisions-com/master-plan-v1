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
    const rawEntries = await redis.get<SitemapEntry[]>(keys.raw)
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
      newEntries = sort(allRawEntries).by([
        { desc: entry => new Date(entry.lastmod).getTime() }
      ])
      
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

    // Always merge and sort all entries chronologically
    const allEntries = [...processedEntries]
    
    // Create a Set of existing URLs for O(1) lookup
    const existingUrls = new Set(processedEntries.map(e => e.url))
    
    // Only add entries that don't exist in processed entries
    for (const entry of newEntries) {
      if (!existingUrls.has(entry.url)) {
        allEntries.push(entry)
      }
    }
    
    // Re-sort all entries to maintain chronological order
    const sortedEntries = sort(allEntries).by([
      { desc: entry => new Date(entry.lastmod).getTime() }
    ])
    
    // Always update the processed entries cache with the latest sorted entries
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

    // Calculate how many entries we need to process to satisfy this page request
    const targetEntryCount = end
    let currentEntryCount = 0
    let processedSitemapResults: SitemapEntry[] = []
    const unprocessedSitemapResults: SitemapEntry[] = []
    
    // First, get all entries from processed sitemaps
    if (processedUrls.length > 0) {
      const processedKeys = processedUrls.map(url => getSitemapKeys(url).processed)
      const processedEntries = await redis.mget<(SitemapEntry[] | null)[]>(processedKeys)
      
      processedSitemapResults = processedEntries
        .filter((entries): entries is SitemapEntry[] => Array.isArray(entries))
        .flat()
        
      currentEntryCount = processedSitemapResults.length
      logger.info('Got entries from processed sitemaps:', { 
        count: currentEntryCount,
        processedSitemapsCount: processedUrls.length
      })
    }

    // Then process unprocessed sitemaps one at a time until we have enough entries
    if (unprocessedUrls.length > 0 && currentEntryCount < targetEntryCount) {
      for (const url of unprocessedUrls) {
        const result = await processUrl(url)
        unprocessedSitemapResults.push(...result.entries)
        currentEntryCount += result.entries.length
        
        // Move this URL to processed list since we've now processed it
        processedUrls.push(url)
        unprocessedUrls = unprocessedUrls.filter(u => u !== url)
        
        logger.info('Processed new sitemap:', {
          url,
          entriesCount: result.entries.length,
          totalProcessedCount: currentEntryCount,
          targetCount: targetEntryCount,
          remainingUnprocessed: unprocessedUrls.length
        })

        // If we have enough entries for this page (plus some buffer), stop processing
        if (currentEntryCount >= targetEntryCount * 1.5) {
          break
        }
      }
    }

    // Merge all entries and sort chronologically
    const allMergedEntries = [...processedSitemapResults, ...unprocessedSitemapResults]
    const sortedEntries = sort(allMergedEntries).by([
      { desc: entry => new Date(entry.lastmod).getTime() }
    ])

    logger.info('Merged and sorted all entries:', {
      totalEntries: sortedEntries.length,
      processedEntries: processedSitemapResults.length,
      newlyProcessedEntries: unprocessedSitemapResults.length,
      firstDate: sortedEntries[0]?.lastmod,
      lastDate: sortedEntries[sortedEntries.length - 1]?.lastmod
    })

    // Get entries for current page
    const paginatedEntries = sortedEntries.slice(start, end)
    const hasMore = sortedEntries.length > end || unprocessedUrls.length > 0

    logger.info('Returning paginated entries:', {
      page,
      start,
      end,
      paginatedCount: paginatedEntries.length,
      totalEntries: sortedEntries.length,
      hasMore,
      remainingUnprocessed: unprocessedUrls.length,
      firstPageDate: paginatedEntries[0]?.lastmod,
      lastPageDate: paginatedEntries[paginatedEntries.length - 1]?.lastmod
    })

    return {
      entries: paginatedEntries,
      hasMore,
      total: sortedEntries.length + (unprocessedUrls.length * 20), // Estimate remaining entries
      nextCursor: hasMore ? page + 1 : null,
      currentPage: page,
      processedUrls,
      unprocessedUrls
    }
  } catch (error) {
    logger.error('Error in getProcessedFeedEntries:', error)
    return { 
      entries: [], 
      hasMore: false, 
      total: 0, 
      nextCursor: null,
      currentPage: page,
      processedUrls,
      unprocessedUrls
    }
  }
} 