// import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
import { SitemapEntry } from './types'
import { XMLParser } from 'fast-xml-parser'
import { redis } from '@/lib/redis/client'
import { unstable_cache } from 'next/cache'

// Add proper type for sitemap entries
interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
}

interface ProcessedSitemapEntry {
  url: string;
  lastmod: string;
}

interface MetaTags {
  title: string;
  description: string;
  image?: string;
}

// Add at the top near other constants
const SITEMAP_CACHE_TTL = 86400; // 24 hours in seconds
const ITEMS_PER_PAGE = 10;

// Change from constant to function
const getRawSitemapCacheKey = (url: string) => `sitemap:${url}:raw-xml`;

// Helper function to parse and normalize dates
function normalizeDate(dateStr: string): string {
  try {
    const date = dateStr.includes('T') 
      ? new Date(dateStr)
      : new Date(`${dateStr}T00:00:00.000Z`);
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    return date.toISOString();
  } catch (error) {
    logger.error('Date normalization failed:', { dateStr, error });
    return new Date().toISOString();
  }
}

// Update the sitemap fetching with expiration and delta processing
async function getCachedOrFetchSitemap(url: string): Promise<{ xml: string; isNew: boolean }> {
  const rawKey = getRawSitemapCacheKey(url);
  const cachedRaw = await redis.get<string>(rawKey);
  
  if (cachedRaw) {
    logger.debug('RAW SITEMAP CACHE HIT', { url });
    return { xml: cachedRaw, isNew: false };
  }

  logger.debug('RAW SITEMAP CACHE MISS', { url });
  const response = await fetch(url);
  const xmlText = await response.text();
  
  // Store with 24h expiration
  await redis.set(rawKey, xmlText, { ex: SITEMAP_CACHE_TTL });
  
  return { xml: xmlText, isNew: true };
}

// Update getSitemapPage to use fetchMetaTagsBatch
export async function getSitemapPage(url: string, page: number) {
  const processedKey = `sitemap:${url}:processed`;
  const { xml } = await getCachedOrFetchSitemap(url);
  
  // Parse all URLs but only process meta tags for requested page
  const allEntries = processSitemapXml(xml);
  const existingProcessed = await redis.get<SitemapEntry[]>(processedKey) || [];
  const processedUrls = new Set(existingProcessed.map(e => e.url));
  
  // Calculate page bounds
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  
  // Get entries for current page that haven't been processed yet
  const unprocessedPageEntries = allEntries
    .slice(start, end)
    .filter(entry => !processedUrls.has(entry.url));

  if (unprocessedPageEntries.length > 0) {
    // Convert entries to SitemapUrlEntry format for batch processing
    const urlEntries = unprocessedPageEntries.map(entry => ({
      loc: entry.url,
      lastmod: entry.lastmod
    }));

    // Process new entries using batch function
    const batchResults = await fetchMetaTagsBatch(urlEntries.map(e => e.loc));
    
    // Convert batch results back to SitemapEntry format
    const newProcessed = urlEntries
      .map(entry => {
        const meta = batchResults[entry.loc];
        if (!meta) return null;
        
        return {
          url: entry.loc,
          lastmod: normalizeDate(entry.lastmod),
          meta
        };
      })
      .filter((e): e is SitemapEntry => e !== null);

    // Merge with existing entries
    if (newProcessed.length > 0) {
      const updatedEntries = [...newProcessed, ...existingProcessed]
        .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());
      await redis.set(processedKey, updatedEntries);
    }
  }

  // Get final processed entries for page
  const finalProcessed = await redis.get<SitemapEntry[]>(processedKey) || [];
  const pageEntries = finalProcessed.slice(start, end);

  return {
    entries: pageEntries,
    hasMore: end < allEntries.length,
    total: allEntries.length,
    currentPage: page,
    pageSize: ITEMS_PER_PAGE
  };
}

// Add batch processing interface
interface BatchMetaRequest {
  urls: string[];
}

interface BatchMetaResponse {
  [url: string]: MetaTags;
}

// Update fetchMetaTagsBatch to handle individual requests in parallel
async function fetchMetaTagsBatch(urls: string[]): Promise<BatchMetaResponse> {
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
          description: data.meta_tags?.find((t: any) => t.name === 'description')?.content || '',
          image: data.meta_tags?.find((t: any) => t.property === 'og:image')?.content || undefined
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
    const batchResults: BatchMetaResponse = {};

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

// Fix any types by using proper type annotations
async function processSitemapContent(xml: string): Promise<SitemapUrlEntry[]> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const parsed = parser.parse(xml) as {
      urlset?: { url?: Array<{ loc?: string; lastmod?: string }> };
      sitemapindex?: { sitemap?: Array<{ loc?: string }> };
    };

    // ... rest of the implementation remains the same ...
  } catch (error) {
    logger.error('XML processing failed:', error);
    return [];
  }
}

// Update setInCache with proper types
export async function setInCache<T>(
  key: string, 
  value: T, 
  options?: { ttl?: number }
): Promise<void> {
  try {
    const redisOptions: {
      ex?: number;
      cache?: 'force-cache';
      next?: { revalidate: false; tags: string[] };
    } = {
      ...(options?.ttl ? { ex: options.ttl } : {}),
      cache: 'force-cache',
      next: {
        revalidate: false,
        tags: ['redis']
      }
    };

    await redis.set(key, value, redisOptions);
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

// Update processSitemapXml to return full SitemapEntry objects.
function processSitemapXml(xmlText: string): SitemapEntry[] {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });
    
    const parsed = parser.parse(xmlText);
    return (parsed.urlset?.url || []).map((entry: unknown) => {
      const e = entry as Record<string, unknown>;
      return {
        url: e.loc as string, 
        lastmod: (e.lastmod as string) || new Date().toISOString(),
        meta: {
          title: '',
          description: '',
          image: undefined
        }
      };
    });
  } catch (error) {
    logger.error('XML processing failed:', error);
    return [];
  }
} 