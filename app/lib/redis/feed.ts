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
    
    // If there are more pages, recursively fetch them
    if (result.hasMore) {
      const nextPageResult = await processUrl(url, page + 1)
      return {
        entries: [...entries, ...nextPageResult.entries],
        hasMore: nextPageResult.hasMore,
        total: result.total,
        nextCursor: nextPageResult.hasMore ? page + 2 : null
      }
    }
    
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
    // Process all URLs and get all their entries
    const results = await Promise.all(
      urls.map(url => processUrl(url, 1)) // Always start from page 1
    )

    // Combine all entries from all sitemaps
    const allEntries = results.flatMap(r => r.entries)
    const totalEntries = results.reduce((sum, r) => sum + r.total, 0)
    
    // Sort all entries by date
    const sortedEntries = allEntries.sort(
      (a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
    )

    // Calculate pagination
    const itemsPerPage = 20
    const start = (page - 1) * itemsPerPage
    const end = start + itemsPerPage
    const paginatedEntries = sortedEntries.slice(start, end)
    const hasMore = end < sortedEntries.length

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