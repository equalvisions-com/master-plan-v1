import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import type { ProcessedResult, PaginationResult } from '@/app/types/feed'

// Helper function to process a single URL
async function processUrl(url: string, page: number): Promise<ProcessedResult> {
  try {
    const result = await getSitemapPage(url, page)
    const entries = result.entries.map(entry => ({
      ...entry,
      sourceKey: url
    }))
    
    return {
      entries,
      hasMore: result.hasMore,
      total: result.total,
      nextCursor: result.hasMore ? page + 1 : null
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
    // Process all URLs with the current page number
    const results = await Promise.all(
      urls.map(url => processUrl(url, page))
    )

    // Combine all entries from all sitemaps
    const allEntries = results.flatMap(r => r.entries)
    const totalEntries = results.reduce((sum, r) => sum + r.total, 0)
    
    // Sort all entries by date
    const sortedEntries = allEntries.sort(
      (a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
    )

    // Take 20 entries for the current page
    const paginatedEntries = sortedEntries.slice(0, 20)
    
    // We have more if any sitemap has more pages or if we have more than 20 entries
    const hasMore = results.some(r => r.hasMore) || sortedEntries.length > 20

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