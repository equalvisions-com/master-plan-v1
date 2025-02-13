import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import type { SitemapEntry } from '@/app/types/feed'

interface ProcessedResult {
  entries: SitemapEntry[]
  hasMore: boolean
  total: number
  nextCursor: number | null
}

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

export async function getProcessedFeedEntries(urls: string[], limit: number): Promise<ProcessedResult> {
  try {
    const results = await Promise.all(
      urls.map(url => processUrl(url))
    )

    const flattenedEntries = results.flatMap(r => r.entries)
    const totalEntries = results.reduce((sum: number, r: ProcessedResult) => sum + r.total, 0)

    return {
      entries: flattenedEntries,
      hasMore: flattenedEntries.length >= limit,
      total: totalEntries,
      nextCursor: calculateNextCursor(flattenedEntries)
    }
  } catch (error) {
    logger.error('Error in getProcessedFeedEntries:', error)
    return { entries: [], hasMore: false, total: 0, nextCursor: null }
  }
} 