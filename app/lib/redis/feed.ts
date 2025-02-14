import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import { sort } from 'fast-sort'
import type { ProcessedResult, PaginationResult, SitemapEntry } from '@/app/types/feed'

const ITEMS_PER_PAGE = 20

// Helper function to process a single URL for a specific page
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
    // Process all URLs in parallel for the current page
    const results = await Promise.all(
      urls.map(url => processUrl(url, page))
    )

    // Combine all entries from all sitemaps
    const allEntries = results.flatMap(r => r.entries)
    const totalEntries = results.reduce((sum, r) => sum + r.total, 0)
    
    // Use fast-sort for better performance
    const paginatedEntries = sort(allEntries)
      .desc(entry => new Date(entry.lastmod).getTime())
      .slice(0, ITEMS_PER_PAGE)
    
    // We have more entries if any source has more pages
    const hasMore = results.some(r => r.hasMore)

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