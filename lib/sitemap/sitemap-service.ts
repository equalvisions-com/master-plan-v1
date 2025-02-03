// import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
import { SitemapEntry } from './types'
import { XMLParser } from 'fast-xml-parser'
import { redis } from '@/lib/redis/client'

// Removed the unused interface SitemapUrlEntry
// interface SitemapUrlEntry {
//   loc: string;
//   lastmod: string;
// }

export interface MetaTags {
  title: string;
  description: string;
  image?: string;
}

// Add at the top near other constants
const SITEMAP_RAW_TTL = 86400; // 24 hours

// Removed unused ITEMS_PER_PAGE constant
// const ITEMS_PER_PAGE = 10;

// Change from constant to function
// const getRawSitemapCacheKey = (url: string) => `sitemap:${url}:raw-xml`;

// Removed unused helper function normalizeDate
// function normalizeDate(dateStr: string): string {
//   try {
//     const date = dateStr.includes('T')
//       ? new Date(dateStr)
//       : new Date(`${dateStr}T00:00:00.000Z`);
    
//     if (isNaN(date.getTime())) {
//       throw new Error('Invalid date');
//     }
    
//     return date.toISOString();
//   } catch (error) {
//     logger.error('Date normalization failed:', { dateStr, error });
//     return new Date().toISOString();
//   }
// }

// Removed unused function getCachedOrFetchSitemap
// async function getCachedOrFetchSitemap(url: string): Promise<{ xml: string; isNew: boolean }> {
//   const rawKey = getRawSitemapCacheKey(url);
//   const cachedRaw = await redis.get<string>(rawKey);
//   
//   if (cachedRaw) {
//     logger.debug('RAW SITEMAP CACHE HIT', { url });
//     return { xml: cachedRaw, isNew: false };
//   }
//
//   logger.debug('RAW SITEMAP CACHE MISS', { url });
//   const response = await fetch(url);
//   const xmlText = await response.text();
//   
//   // Use proper Redis options structure
//   await redis.set(rawKey, xmlText, { ex: SITEMAP_CACHE_TTL });
//   
//   return { xml: xmlText, isNew: true };
// }

// Removed unused interfaces BatchMetaRequest and BatchMetaResponse
// interface BatchMetaRequest {
//   urls: string[];
// }

// interface BatchMetaResponse {
//   [url: string]: MetaTags;
// }

// Define an interface for individual meta tag items from the API
export interface ApiMetaTag {
  property?: string;
  name?: string;
  content: string;
}

// Update fetchMetaTagsBatch to handle individual requests in parallel
async function fetchMetaTagsBatch(urls: string[]): Promise<Record<string, MetaTags>> {
  try {
    // Process URLs in parallel with individual requests since batch endpoint isn't available
    const promises = urls.map(async (url) => {
      try {
        const response = await fetch(`https://api.apilayer.com/meta_tags?url=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'apikey': process.env.META_TAGS_API_KEY!,
          } as Record<string, string>,
          cache: 'force-cache',
          next: {
            revalidate: false
          }
        });

        if (!response.ok) {
          throw new Error(`Meta tags API error for ${url}: ${response.status}`);
        }

        const data = await response.json();
        return [url, {
          title: data.title || '',
          description: data.meta_tags?.find((t: ApiMetaTag) => t.name === 'description')?.content || '',
          image: data.meta_tags?.find((t: ApiMetaTag) => t.property === 'og:image')?.content || undefined
        }] as [string, MetaTags];
      } catch (error) {
        logger.error(`Failed to fetch meta tags for ${url}:`, error);
        return [url, {
          title: '',
          description: '',
          image: undefined
        }] as [string, MetaTags];
      }
    });

    // Wait for all requests to complete
    const results = await Promise.allSettled(promises);
    const batchResults: Record<string, MetaTags> = {};

    // Process results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [url, meta] = result.value;
        batchResults[url] = meta;
      }
    });

    return batchResults;
  } catch (error) {
    logger.error(`Failed to fetch meta tags batch:`, error);
    return {};
  }
}

// Update setInCache with correct Redis command options
export async function setInCache<T>(
  key: string,
  value: T,
  options?: { ttl?: number }
): Promise<void> {
  try {
    const commandOptions = options?.ttl 
      ? { ex: options.ttl }  // Proper EX seconds type
      : undefined;

    await redis.set(key, JSON.stringify(value), commandOptions);
  } catch (error) {
    console.error('Error setting cache:', error);
    throw error;
  }
}

// For backward compatibility
export async function cacheSitemapEntries(url: string) {
  const result = await getSitemapPage(url, 1);
  return {
    entries: result.entries,
    hasMore: result.hasMore,
    total: result.total
  };
}

// Add type definition for XML entry
interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
}

// Update the XML processing to extract meta tags
async function processSitemapXml(xmlText: string): Promise<{ urls: Array<{url: string, lastmod: string}>, total: number }> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const parsed = parser.parse(xmlText);
    const entries = parsed?.urlset?.url || [];
    
    return {
      urls: entries.map((entry: SitemapUrlEntry) => ({
        url: entry.loc,
        lastmod: entry.lastmod || new Date().toISOString()
      })),
      total: entries.length
    };
  } catch (error) {
    logger.error('XML processing failed:', error);
    return { urls: [], total: 0 };
  }
}

// Updated getSitemapPage with full sitemap caching
export async function getSitemapPage(
  url: string,
  page: number,
  perPage = 10
) {
  try {
    const rawKey = `sitemap:${url}:raw`;
    const processedKey = `sitemap:${url}:processed`;

    // Get or refresh raw XML
    let rawXml = await redis.get<string>(rawKey);
    if (!rawXml) {
      const response = await fetch(url);
      rawXml = await response.text();
      await redis.setex(rawKey, SITEMAP_RAW_TTL, rawXml);
    }

    // Parse XML to get all URLs
    const { urls: allUrls, total } = await processSitemapXml(rawXml);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageUrls = allUrls.slice(start, end);

    // Get existing processed entries
    let processedEntries = await redis.get<SitemapEntry[]>(processedKey) || [];
    
    // Find unprocessed URLs in current page
    const unprocessed = pageUrls.filter(u => 
      !processedEntries.some(e => e.url === u.url)
    );

    // Process only the unprocessed URLs in this page
    if (unprocessed.length > 0) {
      const newEntries = await processUrls(unprocessed, processedKey);
      processedEntries = [...processedEntries, ...newEntries];
      await redis.set(processedKey, processedEntries); // Persistent storage
    }

    // Get final entries for this page
    const finalEntries = processedEntries.filter(e => 
      pageUrls.some(u => u.url === e.url)
    );

    return {
      entries: finalEntries,
      hasMore: end < total,
      total,
      currentPage: page,
      pageSize: perPage
    };
  } catch (error) {
    logger.error('Failed to get sitemap page:', error);
    return { 
      entries: [], 
      hasMore: false, 
      total: 0,
      currentPage: page,
      pageSize: perPage
    };
  }
}

async function processUrls(
  urls: Array<{url: string, lastmod: string}>, 
  processedKey: string
): Promise<SitemapEntry[]> {
  // Get existing processed entries
  const existingProcessed = await redis.get<SitemapEntry[]>(processedKey) || [];
  
  // Find URLs needing metadata
  const uncachedUrls = urls.filter(u => 
    !existingProcessed.some(e => e.url === u.url)
  );

  // Only fetch metadata for uncached URLs
  const metaBatch = await fetchMetaTagsBatch(uncachedUrls.map(u => u.url));
  
  // Create new entries
  const newEntries = uncachedUrls.map(({url, lastmod}) => ({
    url,
    lastmod,
    meta: metaBatch[url] || {
      title: '',
      description: '',
      image: undefined
    }
  }));

  return newEntries;
}