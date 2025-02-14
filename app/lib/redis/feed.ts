import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import type { ProcessedResult, PaginationResult } from '@/app/types/feed'

const ITEMS_PER_PAGE = 20

// Helper function to process a single URL and get all available entries
async function processUrl(url: string, maxEntries: number = Infinity): Promise<ProcessedResult> {
  try {
    let page = 1
    let allEntries: any[] = []
    let hasMorePages = true
    let total = 0

    // Keep fetching pages until we have enough entries or no more pages
    while (hasMorePages && allEntries.length < maxEntries) {
      const result = await getSitemapPage(url, page)
      const entries = result.entries.map(entry => ({
        ...entry,
        sourceKey: url
      }))
      
      allEntries = [...allEntries, ...entries]
      total = result.total
      hasMorePages = result.hasMore
      page++

      // Add small delay to prevent rate limiting
      if (hasMorePages) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    return {
      entries: allEntries,
      hasMore: hasMorePages,
      total,
      nextCursor: hasMorePages ? page : null
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
    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE

    // Process all URLs and get enough entries to satisfy the current page
    const results = await Promise.all(
      urls.map(url => processUrl(url, endIndex + ITEMS_PER_PAGE))
    )

    // Combine all entries from all sitemaps
    const allEntries = results.flatMap(r => r.entries)
    const totalEntries = results.reduce((sum, r) => sum + r.total, 0)
    
    // Sort all entries by date
    const sortedEntries = allEntries.sort(
      (a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
    )

    // Get the correct slice for the current page
    const paginatedEntries = sortedEntries.slice(startIndex, endIndex)
    
    // We have more entries if there are entries after our current page
    const hasMore = sortedEntries.length > endIndex

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