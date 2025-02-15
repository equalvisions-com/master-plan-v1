import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import { sort } from 'fast-sort'
import { redis } from '@/lib/redis/client'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import type { ProcessedResult, PaginationResult, SitemapEntry } from '@/app/types/feed'

const BATCH_SIZE = 3; // Process 3 sitemaps at a time
const BATCH_DELAY = 1000; // 1 second delay between batches

// Helper function to get Redis keys for a sitemap URL
function getSitemapKeys(url: string) {
  // Strip protocol, www, and .com to match existing key structure
  // e.g., https://bensbites.beehiiv.com/sitemap.xml -> sitemap.bensbites
  const normalizedDomain = normalizeUrl(url)
    .replace(/^https?:\/\//, '')  // Remove protocol
    .replace(/^www\./, '')        // Remove www
    .replace(/\.com/, '')         // Remove .com
    .replace(/\.beehiiv/, '')     // Remove .beehiiv
    .replace(/\/sitemap\.xml$/, '') // Remove /sitemap.xml
    .replace(/\/$/, '')           // Remove trailing slash
  
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
    
    // Get existing processed entries with type validation
    const processedData = await redis.get<SitemapEntry[]>(keys.processed)
    const processedEntries = Array.isArray(processedData) ? processedData : []
    
    logger.info('Found processed entries:', { 
      url, 
      processedCount: processedEntries.length,
      processedKey: keys.processed
    })
    
    // Get raw XML entries with type validation
    const rawData = await redis.get<SitemapEntry[]>(keys.raw)
    const rawEntries = Array.isArray(rawData) ? rawData : null
    let newEntries: SitemapEntry[] = []

    // If raw cache doesn't exist or is expired, fetch fresh XML
    if (!rawEntries) {
      logger.info('No raw entries found, fetching fresh XML:', { url })
      let page = 1
      let hasMore = true
      const allRawEntries: SitemapEntry[] = []

      // Fetch all pages from this sitemap
      while (hasMore) {
        const result = await getSitemapPage(url, page)
        if (!Array.isArray(result.entries)) {
          throw new Error('Invalid sitemap response: entries is not an array')
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

// Helper function to process URLs in batches
async function processBatch(urls: string[]): Promise<ProcessedResult[]> {
  return Promise.all(urls.map(processUrl));
}

export async function getProcessedFeedEntries(
  processedUrls: string[], 
  unprocessedUrls: string[],
  page: number
): Promise<PaginationResult> {
  try {
    logger.info('Getting processed feed entries:', {
      processedUrlsCount: processedUrls.length,
      unprocessedUrlsCount: unprocessedUrls.length,
      page
    })

    // Combine all URLs while maintaining order (processed first)
    const allUrls = [...processedUrls, ...unprocessedUrls];
    const results: ProcessedResult[] = [];

    // Process URLs in batches
    for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
      const batch = allUrls.slice(i, i + BATCH_SIZE);
      logger.info('Processing batch:', { 
        batchNumber: Math.floor(i / BATCH_SIZE) + 1,
        batchSize: batch.length,
        totalBatches: Math.ceil(allUrls.length / BATCH_SIZE)
      });

      const batchResults = await processBatch(batch);
      results.push(...batchResults);

      // Add delay between batches to prevent timeouts
      if (i + BATCH_SIZE < allUrls.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // Combine all entries from all sitemaps
    const allEntries = results.flatMap(r => r.entries);
    const totalEntries = allEntries.length;
    
    logger.info('Combined all entries:', {
      totalEntries,
      resultsCount: results.length
    });
    
    // Sort all entries by date using fast-sort
    const sortedEntries = sort(allEntries).desc(entry => new Date(entry.lastmod).getTime());

    // Calculate pagination
    const itemsPerPage = 20;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    
    // Get entries for current page
    const paginatedEntries = sortedEntries.slice(start, end);
    
    // We have more if there are entries after the current page
    const hasMore = end < totalEntries;

    logger.info('Returning paginated entries:', {
      page,
      start,
      end,
      paginatedCount: paginatedEntries.length,
      hasMore,
      totalEntries
    });

    return {
      entries: paginatedEntries,
      hasMore,
      total: totalEntries,
      nextCursor: hasMore ? page + 1 : null,
      currentPage: page
    };
  } catch (error) {
    logger.error('Error in getProcessedFeedEntries:', error);
    return { 
      entries: [], 
      hasMore: false, 
      total: 0, 
      nextCursor: null,
      currentPage: page
    };
  }
} 