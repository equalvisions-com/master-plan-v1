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

    // Get entries from all sitemaps first
    const allUrls = [...processedUrls, ...unprocessedUrls]
    
    // Generate all keys for processed and raw entries
    const allKeys = allUrls.flatMap(url => {
      const keys = getSitemapKeys(url)
      return [keys.processed, keys.raw]
    })

    // Batch fetch all processed and raw entries in a single MGET operation
    const allEntries = await redis.mget<(SitemapEntry[] | null)[]>(allKeys)
    
    // Create maps for O(1) lookup of processed and raw entries
    const processedEntriesMap = new Map<string, SitemapEntry[]>()
    const rawEntriesMap = new Map<string, SitemapEntry[]>()
    
    allUrls.forEach((url, index) => {
      const processedEntries = allEntries[index * 2]
      const rawEntries = allEntries[index * 2 + 1]
      
      if (Array.isArray(processedEntries)) {
        processedEntriesMap.set(url, processedEntries)
      }
      if (Array.isArray(rawEntries)) {
        rawEntriesMap.set(url, rawEntries)
      }
    })

    // Process all URLs to get their entries
    const sitemapResults = await Promise.all(allUrls.map(async (url) => {
      // Check processed entries first
      let entries = processedEntriesMap.get(url)
      
      // If no processed entries, check raw entries
      if (!entries) {
        entries = rawEntriesMap.get(url)
        
        if (!entries) {
          // Fetch and process new entries from sitemap
          logger.info('Fetching new entries from sitemap:', { url })
          const result = await processUrl(url)
          entries = result.entries
        }
      }

      if (Array.isArray(entries) && entries.length > 0) {
        logger.info('Got entries from sitemap:', {
          url,
          entriesCount: entries.length,
          firstDate: entries[0]?.lastmod,
          lastDate: entries[entries.length - 1]?.lastmod
        })
        return entries
      }
      return []
    }))

    // Merge all entries from all sitemaps into a single array
    const allMergedEntries = sitemapResults.flat()

    // Sort all entries chronologically by lastmod date
    const sortedEntries = sort(allMergedEntries).by([
      { desc: entry => new Date(entry.lastmod).getTime() }
    ])

    logger.info('Merged and sorted all sitemap entries:', {
      totalEntries: sortedEntries.length,
      sitemapCount: sitemapResults.length,
      entriesPerSitemap: sitemapResults.map(entries => entries.length),
      firstDate: sortedEntries[0]?.lastmod,
      lastDate: sortedEntries[sortedEntries.length - 1]?.lastmod
    })

    // Get entries for current page
    const paginatedEntries = sortedEntries.slice(start, end)
    const hasMore = sortedEntries.length > end

    logger.info('Returning paginated entries:', {
      page,
      start,
      end,
      paginatedCount: paginatedEntries.length,
      totalEntries: sortedEntries.length,
      hasMore,
      firstPageDate: paginatedEntries[0]?.lastmod,
      lastPageDate: paginatedEntries[paginatedEntries.length - 1]?.lastmod
    })

    return {
      entries: paginatedEntries,
      hasMore,
      total: sortedEntries.length,
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