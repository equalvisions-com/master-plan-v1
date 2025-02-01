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

interface MetaTags {
  title: string;
  description: string;
  image?: string;
}

// Add at the top near other constants
// const SITEMAP_CACHE_TTL = 86400; // 24 hours in seconds
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
interface ApiMetaTag {
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
          },
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

// Update the XML processing to extract meta tags
async function processSitemapXml(xmlText: string): Promise<SitemapEntry[]> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const parsed = parser.parse(xmlText);
    // Explicitly type entries as unknown[]
    const entries: unknown[] = parsed?.urlset?.url 
      ? Array.isArray(parsed.urlset.url) 
        ? parsed.urlset.url 
        : [parsed.urlset.url]
      : [];

    // Explicitly type the parameter of map to avoid implicit any
    const urls = entries.map((entry: unknown) => (entry as { loc: string }).loc);
    const metaBatch = await fetchMetaTagsBatch(urls);

    return entries.map((entry: unknown) => {
      const e = entry as Record<string, unknown>;
      const url = e.loc as string;
      const meta = metaBatch[url] || {
        title: '',
        description: '',
        image: undefined
      };
      
      return {
        url,
        lastmod: (e.lastmod as string) || new Date().toISOString(),
        meta
      };
    });
  } catch (error) {
    logger.error('XML processing failed:', error);
    return [];
  }
}

// Update getSitemapPage to handle array initialization
export async function getSitemapPage(
  url: string,
  page: number,
  perPage = 10
): Promise<{ entries: SitemapEntry[]; hasMore: boolean; total: number }> {
  try {
    const xmlResponse = await fetch(url);
    const xmlText = await xmlResponse.text();
    const allEntries = await processSitemapXml(xmlText);
    
    // Ensure allEntries is always an array
    const safeEntries = Array.isArray(allEntries) ? allEntries : [];
    
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const hasMore = end < safeEntries.length;

    return {
      entries: safeEntries.slice(start, end),
      hasMore,
      total: safeEntries.length
    };
  } catch (error) {
    logger.error('Failed to get sitemap page:', error);
    return { entries: [], hasMore: false, total: 0 };
  }
}