import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import type { SitemapEntry, ProcessedResult, PaginationResult } from '@/app/types/feed'
import { ITEMS_PER_PAGE } from '@/app/types/feed'

// Helper function to calculate next cursor
function calculateNextCursor(entries: SitemapEntry[]): number | null {
  return entries.length > 0 ? entries.length : null
}

// Helper function to process a single URL
async function processUrl(url: string): Promise<ProcessedResult> {
  try {
    const result = await getSitemapPage(url, 1)
    const entries = result.entries.map(entry => ({
      ...entry,
      sourceKey: url
    }))
    
    return {
      entries,
      hasMore: result.hasMore,
      total: result.total,
      nextCursor: calculateNextCursor(entries)
    }
  } catch (error) {
    logger.error('Error processing URL:', { url, error })
    return { entries: [], hasMore: false, total: 0, nextCursor: null }
  }
}

// Helper function to paginate entries
function paginateEntries(entries: SitemapEntry[], page: number): SitemapEntry[] {
  const start = (page - 1) * ITEMS_PER_PAGE
  return entries.slice(start, start + ITEMS_PER_PAGE)
}

export async function getProcessedFeedEntries(
  urls: string[], 
  page: number
): Promise<PaginationResult> {
  try {
    // Process all URLs to get total entries
    const results = await Promise.all(
      urls.map(url => processUrl(url))
    )

    // Combine all entries and sort by date
    const allEntries = results
      .flatMap(r => r.entries)
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    const totalEntries = allEntries.length
    const paginatedEntries = paginateEntries(allEntries, page)
    const hasMore = totalEntries > page * ITEMS_PER_PAGE

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