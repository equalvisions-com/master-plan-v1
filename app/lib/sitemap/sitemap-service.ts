import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

const SITEMAP_RAW_TTL = 3600 // 1 hour cache

// Type definitions
export interface SitemapInfo {
  totalEntries: number
}

export interface SitemapPageResult {
  entries: Array<{
    url: string
    lastmod: string
    meta: {
      title: string
      description: string
      image?: string
    }
  }>
  hasMore: boolean
  total: number
}

// Function implementations
const getRawSitemapKey = (url: string): string => {
  const hostname = new URL(url).hostname
  const domain = hostname.replace(/^www\./, '').split('.')[0]
  return `sitemap.${domain}.raw`
}

const getRawSitemapInfo = async (url: string): Promise<SitemapInfo> => {
  const rawKey = getRawSitemapKey(url)
  const rawXml = await redis.get<string>(rawKey)
  
  if (!rawXml) {
    // If no raw sitemap in cache, fetch and cache it
    const response = await fetch(url)
    const xml = await response.text()
    await redis.setex(rawKey, SITEMAP_RAW_TTL, xml)
    
    // Count total entries in the raw XML
    const urlCount = (xml.match(/<url>/g) || []).length
    return { totalEntries: urlCount }
  }
  
  // Count total entries in the cached raw XML
  const urlCount = (rawXml.match(/<url>/g) || []).length
  return { totalEntries: urlCount }
}

const getSitemapPage = async (url: string, page: number, limit = 10): Promise<SitemapPageResult> => {
  try {
    const response = await fetch(url)
    const xml = await response.text()
    
    // Parse XML and extract URLs
    const urlMatches = xml.match(/<url>[\s\S]*?<\/url>/g) || []
    const startIdx = (page - 1) * limit
    const endIdx = startIdx + limit
    
    const entries = urlMatches.slice(startIdx, endIdx).map(urlXml => {
      const locMatch = urlXml.match(/<loc>(.*?)<\/loc>/)
      const lastmodMatch = urlXml.match(/<lastmod>(.*?)<\/lastmod>/)
      const titleMatch = urlXml.match(/<title>(.*?)<\/title>/)
      const descMatch = urlXml.match(/<description>(.*?)<\/description>/)
      const imageMatch = urlXml.match(/<image>(.*?)<\/image>/)
      
      return {
        url: locMatch?.[1] || '',
        lastmod: lastmodMatch?.[1] ? new Date(lastmodMatch[1]).toISOString() : new Date().toISOString(),
        meta: {
          title: titleMatch?.[1] || '',
          description: descMatch?.[1] || '',
          image: imageMatch?.[1] || undefined
        }
      }
    })
    
    return {
      entries,
      hasMore: endIdx < urlMatches.length,
      total: urlMatches.length
    }
  } catch (error) {
    logger.error('Error fetching sitemap page:', error)
    return { entries: [], hasMore: false, total: 0 }
  }
}

// Export all functions
export {
  getRawSitemapKey,
  getRawSitemapInfo,
  getSitemapPage
} 