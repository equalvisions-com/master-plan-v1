import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import { sort } from 'fast-sort'
import { redis } from '@/lib/redis/client'
import type { ProcessedResult, PaginationResult, SitemapEntry } from '@/app/types/feed'

const ITEMS_PER_PAGE = 20
const CACHE_TTL = 3600 // 1 hour cache

// Helper function to get cached entries
async function getCachedEntries(url: string, page: number): Promise<ProcessedResult | null> {
  try {
    const cacheKey = `processed:${url}:${page}`
    const cached = await redis.get(cacheKey)
    if (!cached) {
      return null
    }
    return JSON.parse(cached as string)
  } catch (error) {
    logger.error('Error getting cached entries:', { url, page, error })
    return null
  }
}

// Helper function to cache processed entries
async function cacheEntries(url: string, page: number, result: ProcessedResult): Promise<void> {
  try {
    const cacheKey = `processed:${url}:${page}`
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result))
  } catch (error) {
    logger.error('Error caching entries:', { url, page, error })
  }
}

// Helper function to check if a sitemap is newly bookmarked
async function isNewBookmark(url: string): Promise<boolean> {
  try {
    const processedKey = `processed:${url}:1`
    return !(await redis.exists(processedKey))
  } catch (error) {
    logger.error('Error checking if new bookmark:', { url, error })
    return true // Treat as new if we can't verify
  }
}

// Helper function to process a single URL and get all entries up to current page
async function processUrl(url: string, targetPage: number): Promise<ProcessedResult> {
  try {
    const isNew = await isNewBookmark(url)
    let allEntries: SitemapEntry[] = []
    let hasMore = false
    let total = 0

    if (isNew) {
      // For new bookmarks, fetch first page immediately to get chronological data
      logger.info('Processing new bookmark', { url })
      const firstPage = await getSitemapPage(url, 1)
      const firstPageProcessed = {
        entries: firstPage.entries.map(entry => ({
          ...entry,
          sourceKey: url
        })),
        hasMore: firstPage.hasMore,
        total: firstPage.total,
        nextCursor: firstPage.hasMore ? 2 : null
      }
      
      // Cache the first page
      await cacheEntries(url, 1, firstPageProcessed)
      allEntries = firstPageProcessed.entries
      hasMore = firstPageProcessed.hasMore
      total = firstPageProcessed.total

      // If we need more pages and there are more, fetch them
      if (targetPage > 1 && firstPageProcessed.hasMore) {
        const remainingPages = Array.from(
          { length: targetPage - 1 },
          async (_, i) => {
            const page = i + 2 // Start from page 2
            const result = await getSitemapPage(url, page)
            const processed = {
              entries: result.entries.map(entry => ({
                ...entry,
                sourceKey: url
              })),
              hasMore: result.hasMore,
              total: result.total,
              nextCursor: result.hasMore ? page + 1 : null
            }
            await cacheEntries(url, page, processed)
            return processed
          }
        )
        
        const additionalResults = await Promise.all(remainingPages)
        allEntries = [...allEntries, ...additionalResults.flatMap(r => r.entries)]
        const lastResult = additionalResults[additionalResults.length - 1]
        if (lastResult) {
          hasMore = lastResult.hasMore
        }
      }
    } else {
      // For existing bookmarks, use cached data
      const pagePromises = Array.from(
        { length: targetPage },
        async (_, i) => {
          const page = i + 1
          const cached = await getCachedEntries(url, page)
          if (cached) {
            logger.info('Cache hit for page', { url, page })
            return cached
          }
          
          // Cache miss, fetch and process
          logger.info('Cache miss, fetching page', { url, page })
          const result = await getSitemapPage(url, page)
          const processed = {
            entries: result.entries.map(entry => ({
              ...entry,
              sourceKey: url
            })),
            hasMore: result.hasMore,
            total: result.total,
            nextCursor: result.hasMore ? page + 1 : null
          }
          
          await cacheEntries(url, page, processed)
          return processed
        }
      )
      
      const results = await Promise.all(pagePromises)
      allEntries = results.flatMap(r => r.entries)
      const lastResult = results[results.length - 1]
      hasMore = lastResult.hasMore
      total = lastResult.total
    }
    
    return {
      entries: allEntries,
      hasMore,
      total,
      nextCursor: hasMore ? targetPage + 1 : null
    }
  } catch (error) {
    logger.error('Error processing URL:', { url, error })
    return { entries: [], hasMore: false, total: 0, nextCursor: null }
  }
}

export async function getProcessedFeedEntries(
  urls: string[], 
  page: number
): Promise<PaginationResult> {
  try {
    // Process all URLs in parallel, getting all entries up to current page
    const results = await Promise.all(
      urls.map(url => processUrl(url, page))
    )

    // Combine all entries from all sitemaps
    const allEntries = results.flatMap(r => r.entries)
    const totalEntries = results.reduce((sum, r) => sum + r.total, 0)
    
    // Sort all entries chronologically and get the correct page
    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const paginatedEntries = sort(allEntries)
      .desc(entry => new Date(entry.lastmod).getTime())
      .slice(startIndex, startIndex + ITEMS_PER_PAGE)
    
    // We have more entries if any source has more pages or we have more entries
    const hasMore = results.some(r => r.hasMore) || allEntries.length > startIndex + ITEMS_PER_PAGE

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