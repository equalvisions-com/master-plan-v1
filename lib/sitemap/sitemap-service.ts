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
    // Add validation before processing
    const validUrls = urls.filter(url => {
      try {
        const parsed = new URL(url);
        return (
          parsed.protocol.startsWith('http') &&
          parsed.hostname.includes('.') &&
          parsed.hostname !== 'https'
        );
      } catch {
        return false;
      }
    });

    // Process only valid URLs in parallel
    const results = await Promise.all(
      validUrls.map(async (url) => {
        try {
          const response = await fetch(
            `https://api.apilayer.com/meta_tags?url=${encodeURIComponent(url)}`,
            {
              headers: { 'apikey': process.env.META_TAGS_API_KEY! },
              cache: 'force-cache',
              next: { revalidate: false }
            }
          );

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
          }

          const data = await response.json();
          return [url, {
            title: data.title || new URL(url).hostname,
            description: data.meta_tags?.find((t: ApiMetaTag) => t.property === 'og:description')?.content || '',
            image: data.meta_tags?.find((t: ApiMetaTag) => t.property === 'og:image')?.content || ''
          }];
        } catch (error) {
          console.error(`Failed to fetch meta tags for ${url}:`, error);
          return [url, { title: new URL(url).hostname, description: '', image: '' }];
        }
      })
    );

    // Convert results array to object
    return Object.fromEntries(results);
  } catch (error) {
    console.error('Batch meta tags fetch failed:', error);
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
  lastmod: string;
}

async function processSitemapXml(rawXml: string) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: true,
      trimValues: true,
    });
    
    const parsed = parser.parse(rawXml);
    const urlsets = parsed.urlset?.url || [];
    
    const validUrls = await Promise.all(
      urlsets.map(async (entry: SitemapXmlEntry) => {
        const url = entry.loc;
        if (!url || !url.includes('/p/')) return null;

        try {
          const parsed = new URL(url);
          if (!parsed.hostname || parsed.hostname === 'https') {
            console.error('Invalid hostname in sitemap URL:', url);
            return null;
          }
          
          // Parse lastmod as UTC
          const lastmod = entry.lastmod 
            ? new Date(entry.lastmod + (entry.lastmod.includes('T') ? '' : 'T00:00:00Z')).toISOString()
            : new Date().toISOString();

          return {
            url: parsed.toString(),
            lastmod: lastmod
          };
        } catch {
          console.error('Invalid URL in sitemap:', url);
          return null;
        }
      })
    );

    const filteredUrls = validUrls.filter(Boolean);
    
    // Sort by lastmod descending
    filteredUrls.sort((a, b) => 
      Date.parse(b.lastmod) - Date.parse(a.lastmod)
    );

    return { urls: filteredUrls, total: filteredUrls.length };
  } catch {
    return { urls: [], total: 0 };
  }
}

// Add this helper function at the top with other utility functions
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      ['http:', 'https:'].includes(parsed.protocol) &&
      parsed.hostname.includes('.') &&
      parsed.hostname !== 'https'
    );
  } catch {
    return false;
  }
}

// Add at the top with other constants
const BATCH_SIZE = 10; // Number of URLs to process in parallel

async function processBatch(
  urls: Array<{url: string, lastmod: string}>,
  metaBatch: Record<string, MetaTags>
): Promise<SitemapEntry[]> {
  return urls.map(entry => ({
    url: entry.url,
    lastmod: entry.lastmod,
    meta: metaBatch[entry.url] || { 
      title: new URL(entry.url).hostname,
      description: '', 
      image: '' 
    }
  }));
}

async function processUrls(
  urls: Array<{url: string, lastmod: string}>,
  processedKey: string,
  isNewSitemapFetch: boolean = false
): Promise<SitemapEntry[]> {
  try {
    let processedEntries = await redis.get<SitemapEntry[]>(processedKey) || [];
    
    let uncachedUrls: Array<{url: string, lastmod: string}>;

    if (isNewSitemapFetch) {
      const latestProcessedDate = processedEntries.length > 0
        ? Math.max(...processedEntries.map(entry => new Date(entry.lastmod).getTime()))
        : 0;

      uncachedUrls = urls.filter(entry => {
        const entryDate = new Date(entry.lastmod).getTime();
        const isNewer = entryDate > latestProcessedDate;
        const exists = processedEntries.some(e => e.url === entry.url);
        
        return (isNewer || latestProcessedDate === 0) && !exists;
      });
    } else {
      uncachedUrls = urls.filter(
        entry => !processedEntries.some(e => e.url === entry.url)
      );
    }

    if (uncachedUrls.length === 0) return [];

    // Validate URLs before processing
    const validUrls = uncachedUrls.filter(entry => isValidUrl(entry.url));
    
    // Process URLs in batches for better performance
    const newEntries: SitemapEntry[] = [];
    for (let i = 0; i < validUrls.length; i += BATCH_SIZE) {
      const batch = validUrls.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const [metaBatch] = await Promise.all([
        fetchMetaTagsBatch(batch.map(u => u.url)),
        // Add small delay between batches to avoid rate limits
        i > 0 ? new Promise(resolve => setTimeout(resolve, 100)) : Promise.resolve()
      ]);
      
      const batchEntries = await processBatch(batch, metaBatch);
      newEntries.push(...batchEntries);
      
      // Update Redis incrementally with each batch if it's a large processing job
      if (i + BATCH_SIZE < validUrls.length && newEntries.length > 0) {
        const updatedEntries = isNewSitemapFetch
          ? [...newEntries, ...processedEntries]
          : [...processedEntries, ...newEntries];
          
        await redis.set(processedKey, updatedEntries);
        processedEntries = updatedEntries;
      }
    }

    if (newEntries.length > 0) {
      if (isNewSitemapFetch) {
        // Sort by date for new sitemap fetches
        newEntries.sort((a, b) => 
          new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
        );
        processedEntries = [...newEntries, ...processedEntries];
      } else {
        processedEntries = [...processedEntries, ...newEntries];
      }
      
      // Final Redis update
      await redis.set(processedKey, processedEntries);
    }

    return newEntries;
  } catch (error) {
    logger.error('Failed to process URLs:', error);
    return [];
  }
}

// Add export to the function
export function getSitemapIdentifier(url: URL): string {
  // Extract domain name and clean it
  const hostname = url.hostname.toLowerCase();
  const domainName = hostname
    .replace(/^www\./, '') // Remove www.
    .split('.')[0] // Get first part of domain
    .replace(/[^a-zA-Z0-9]/g, ''); // Remove special chars

  return domainName;
}

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

    // Create a readable identifier
    const identifier = getSitemapIdentifier(validatedUrl);
    
    // Use dots as separators (base64 safe)
    const rawKey = `sitemap.${identifier}.raw`;
    const processedKey = `sitemap.${identifier}.processed`;

    // Try to get the raw XML from cache
    let rawXml = await redis.get<string>(rawKey);
    
    // If no cached version exists, fetch it
    if (!rawXml) {
      logger.info('Redis cache miss - fetching external sitemap', { url: validatedUrl.toString() });
      
      try {
        const response = await fetch(validatedUrl.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch sitemap: ${response.status}`);
        }
        
        rawXml = await response.text();
        
        // Cache the raw XML
        await redis.setex(rawKey, SITEMAP_RAW_TTL, rawXml);
        logger.info('Cached new sitemap in Redis', { url: validatedUrl.toString() });
      } catch (error) {
        logger.error('Failed to fetch sitemap', { url: validatedUrl.toString() });
        throw error;
      }
    }

    // Process the XML and continue with existing logic...
    const { urls: allUrls, total } = await processSitemapXml(rawXml);
    if (total === 0) {
      throw new Error('Empty or invalid sitemap');
    }

    // Get processed entries from cache first
    let processedEntries = await redis.get<SitemapEntry[]>(processedKey) || [];
    
    // Filter out any invalid entries
    processedEntries = processedEntries.filter(e => 
      e?.url && 
      e.url.startsWith('http') && 
      !e.url.includes('://https')
    );

    // Process any new URLs from the current page
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageUrls = allUrls.slice(start, end);
    
    // Process new URLs and update Redis
    // Pass false for pagination processing
    await processUrls(pageUrls, processedKey, false);
    
    // Get the updated processed entries after processing new URLs
    processedEntries = await redis.get<SitemapEntry[]>(processedKey) || [];

    // Return only the entries for the current page, maintaining order
    const finalEntries = pageUrls
      .map(pageUrl => processedEntries.find(e => e.url === pageUrl.url))
      .filter((entry): entry is SitemapEntry => entry !== undefined)
      .slice(0, perPage);

    return {
      entries: finalEntries,
      hasMore: end < total,
      total,
      currentPage: page,
      pageSize: perPage
    };
  } catch (error) {
    logger.error('Failed to get sitemap page:', { error });
    throw error;
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