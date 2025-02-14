import { XMLParser } from 'fast-xml-parser'
import { logger } from '@/lib/logger'
import type { SitemapEntry } from '@/app/types/feed'

interface SitemapItem {
  loc?: string
  title?: string
  link?: string | { href: string }
  description?: string
  summary?: string
  image?: { url?: string } | string
  lastmod?: string
  updated?: string
  pubDate?: string
}

interface UrlSet {
  url?: SitemapItem[]
}

interface Feed {
  entry?: SitemapItem[]
}

interface ParsedSitemap {
  urlset?: UrlSet
  feed?: Feed
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ''
})

async function parseSitemapXml(xmlText: string): Promise<SitemapEntry[]> {
  try {
    const parsed = parser.parse(xmlText) as ParsedSitemap
    
    // Handle different sitemap formats
    let items: SitemapItem[] = []
    if (parsed.urlset?.url) {
      items = parsed.urlset.url
    } else if (parsed.feed?.entry) {
      items = parsed.feed.entry
    }
    
    // Normalize the entries
    return items.map((item: SitemapItem) => {
      // Handle RSS feed format
      if (item.title && item.link) {
        return {
          url: typeof item.link === 'string' ? item.link : item.link.href,
          meta: {
            title: item.title,
            description: item.summary || item.description || '',
            image: item.image && typeof item.image === 'object' ? item.image.url : item.image
          },
          lastmod: item.updated || item.lastmod || item.pubDate || new Date().toISOString(),
          sourceKey: ''  // Will be set by the caller
        }
      }
      
      // Handle standard sitemap format
      return {
        url: item.loc || '',
        meta: {
          title: item.title || '',
          description: item.description || '',
          image: item.image && typeof item.image === 'object' ? item.image.url : item.image
        },
        lastmod: item.lastmod || new Date().toISOString(),
        sourceKey: ''  // Will be set by the caller
      }
    })
  } catch (error) {
    logger.error('Error parsing sitemap XML:', error)
    return []
  }
}

export async function getSitemapPage(url: string, page: number) {
  // Calculate offset based on page number
  const offset = (page - 1) * 20
  
  try {
    const response = await fetch(url)
    const xmlText = await response.text()
    const entries = await parseSitemapXml(xmlText)
    
    // Get total entries for this sitemap
    const total = entries.length
    
    // Paginate the entries
    const paginatedEntries = entries.slice(offset, offset + 20)
    const hasMore = offset + 20 < total

    return {
      entries: paginatedEntries,
      hasMore,
      total,
      currentPage: page
    }
  } catch (error) {
    logger.error('Error fetching sitemap:', { url, error })
    return { entries: [], hasMore: false, total: 0, currentPage: page }
  }
} 