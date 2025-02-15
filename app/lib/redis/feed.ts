import { logger } from '@/lib/logger'
import { getSitemapPage } from '@/lib/sitemap/sitemap-service'
import type { ProcessedResult, PaginationResult, SitemapEntry } from '@/app/types/feed'
import { sort } from 'fast-sort'
import { redis } from '@/lib/redis/client'

const SITEMAP_RAW_TTL = 86400 // 24 hours

// Helper function to get Redis keys
const getRedisKeys = (url: string) => ({
  raw: `sitemap.${url}.raw`,
  processed: `sitemap.${url}.processed`
})

// Helper function to process a single URL
async function processUrl(url: string, page: number): Promise<ProcessedResult> {
  try {
    const { raw: rawKey, processed: processedKey } = getRedisKeys(url)
    
    // Try to get raw XML from Redis first
    let rawXml = await redis.get<string>(rawKey)
    
    // If no cached version exists, fetch and cache it
    if (!rawXml) {
      logger.info('Redis cache miss - fetching sitemap:', { url })
      const response = await fetch(url)
      rawXml = await response.text()
      await redis.setex(rawKey, SITEMAP_RAW_TTL, rawXml)
    }

    // Get processed entries from cache
    let processedEntries = await redis.get<SitemapEntry[]>(processedKey) || []
    
    // Process raw XML and append any new entries
    const result = await getSitemapPage(url, page)
    const newEntries = result.entries.map(entry => ({
      ...entry,
      sourceKey: url
    }))

    // Check for new entries that aren't already in processed
    const existingUrls = new Set(processedEntries.map(entry => entry.url))
    const entriesToAdd = newEntries.filter(entry => !existingUrls.has(entry.url))

    if (entriesToAdd.length > 0) {
      // Append new entries to existing ones
      processedEntries = [...processedEntries, ...entriesToAdd]
      
      // Sort all entries chronologically
      processedEntries = sort(processedEntries).desc(entry => new Date(entry.lastmod).getTime())
      
      // Store in Redis persistently (no expiration)
      await redis.set(processedKey, JSON.stringify(processedEntries))
      
      logger.info('Added new entries to processed cache:', { 
        url, 
        newEntriesCount: entriesToAdd.length,
        totalEntries: processedEntries.length 
      })
    }

    // Calculate pagination
    const total = processedEntries.length
    const offset = (page - 1) * 20
    const paginatedEntries = processedEntries.slice(offset, offset + 20)
    const hasMore = offset + 20 < total

    return {
      entries: paginatedEntries,
      hasMore,
      total,
      nextCursor: hasMore ? page + 1 : null
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
    
    // Sort all entries by date using fast-sort
    const sortedEntries = sort(allEntries).desc(entry => new Date(entry.lastmod).getTime())

    // Take 20 entries for the current page, ensuring no entries are skipped
    const paginatedEntries = sortedEntries.slice(0, 20)
    
    // We have more if any sitemap has more entries to show
    const hasMore = totalEntries > page * 20

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