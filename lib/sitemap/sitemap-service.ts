// import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
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
export const SITEMAP_RAW_TTL = 86400; // 24 hours

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

// Keep only the SitemapXmlEntry interface that's actually being used
/** @internal */
interface SitemapXmlEntry {
  loc: string;
  lastmod?: string;
}

async function processSitemapXml(rawXml: string) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseTagValue: true
    });
    
    const parsed = parser.parse(rawXml);
    const urlsets = parsed.urlset?.url || [];
    
    // Update type annotation to use SitemapXmlEntry
    const validUrls = await Promise.all(
      urlsets.map(async (entry: SitemapXmlEntry) => {
        const url = entry.loc;
        if (!url) return null;
        
        try {
          const validatedUrl = new URL(url);
          if (
            !['http:', 'https:'].includes(validatedUrl.protocol) ||
            !validatedUrl.hostname.includes('.') ||
            validatedUrl.hostname.toLowerCase() === 'https'
          ) {
            logger.warn('Invalid URL in sitemap:', { url });
            return null;
          }
          
          return {
            url: validatedUrl.toString(),
            lastmod: entry.lastmod || new Date().toISOString()
          };
        } catch (error) {
          logger.warn('Invalid URL in sitemap:', { url, error });
          return null;
        }
      })
    );

    const filteredUrls = validUrls.filter(Boolean);
    return { urls: filteredUrls, total: filteredUrls.length };
  } catch (error) {
    logger.error('Failed to parse sitemap XML:', error);
    return { urls: [], total: 0 };
  }
}

async function processUrls(
  urls: Array<{url: string, lastmod: string}>,
  processedKey: string
): Promise<SitemapEntry[]> {
  try {
    const existingProcessed = await redis.get<SitemapEntry[]>(processedKey) || [];
    
    const uncachedUrls = urls.filter(
      entry => !existingProcessed.some(e => e.url === entry.url)
    );

    if (uncachedUrls.length === 0) return [];

    const metaBatch = await fetchMetaTagsBatch(uncachedUrls.map(u => u.url));
    
    return uncachedUrls.map(entry => ({
      url: entry.url,
      lastmod: entry.lastmod,
      meta: metaBatch[entry.url] || { title: entry.url, description: '', image: '' }
    }));
  } catch (error) {
    logger.error('Failed to process URLs:', error);
    return [];
  }
}

// Updated getSitemapPage with full sitemap caching
export async function getSitemapPage(
  url: string,
  page: number,
  perPage = 10
): Promise<{
  entries: SitemapEntry[];
  hasMore: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
}> {
  try {
    const validatedUrl = new URL(url);
    if (
      !['http:', 'https:'].includes(validatedUrl.protocol) ||
      !validatedUrl.hostname.includes('.')
    ) {
      throw new Error(`Invalid sitemap URL: ${url}`);
    }

    const rawKey = `sitemap:${validatedUrl.toString()}:raw`;
    const processedKey = `sitemap:${validatedUrl.toString()}:processed`;

    let rawXml = await redis.get<string>(rawKey);
    if (!rawXml) {
      logger.info('Redis cache miss - fetching external sitemap', { url: validatedUrl.toString() });
      const response = await fetch(validatedUrl.toString());
      if (!response.ok) throw new Error(`Failed to fetch sitemap: ${response.status}`);
      rawXml = await response.text();
      await redis.setex(rawKey, SITEMAP_RAW_TTL, rawXml);
      logger.info('Cached new sitemap in Redis', { url: validatedUrl.toString() });
    } else {
      logger.info('Redis cache hit for sitemap', { url: validatedUrl.toString() });
    }

    const { urls: allUrls, total } = await processSitemapXml(rawXml);
    if (total === 0) throw new Error('Empty or invalid sitemap');

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageUrls = allUrls.slice(start, end);

    let processedEntries = await redis.get<SitemapEntry[]>(processedKey) || [];
    const newEntries = await processUrls(pageUrls, processedKey);
    
    if (newEntries.length > 0) {
      processedEntries = [...processedEntries, ...newEntries];
      await redis.set(processedKey, processedEntries);
    }

    const finalEntries = processedEntries
      .filter(e => pageUrls.some(u => u.url === e.url))
      .slice(0, perPage);

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

// Each sitemap entry contains its own meta tags
interface SitemapEntry {
  url: string;
  lastmod: string;
  meta: {
    title: string;
    description: string;
    image?: string;
  };
}