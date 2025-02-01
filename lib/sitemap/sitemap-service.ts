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

// Modified background update logic
async function updateSitemapEntriesInBackground(
  url: string,
  existingEntries: SitemapEntry[]
): Promise<void> {
  const cacheKey = `sitemap:${url}:processed`;

  try {
    // Get latest lastmod from existing processed entries
    const latestProcessed = await getLatestProcessedLastmod(url);
    
    const { xml } = await getCachedOrFetchSitemap(url);
    const processed = processSitemapXml(xml);
    
    // Filter for only new entries
    const newEntriesQueue = processed
      .filter(entry => {
        const entryDate = new Date(normalizeDate(entry.lastmod));
        return entryDate > latestProcessed;
      })
      .map(entry => ({
        loc: entry.url,
        lastmod: entry.lastmod
      }));

    if (newEntriesQueue.length > 0) {
      // Increase batch size for better concurrency
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < newEntriesQueue.length; i += batchSize) {
        const batch = newEntriesQueue.slice(i, i + batchSize);
        batches.push(processBatch(batch));
      }

      // Process all batches concurrently
      const processedBatches = await Promise.all(batches);
      const allProcessed = processedBatches.flat();

      if (allProcessed.length > 0) {
        const updatedEntries = [...allProcessed, ...existingEntries]
          .sort((a, b) => 
            new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
          );
        
        await redis.set(cacheKey, updatedEntries);
      }
    }
  } catch (error) {
    logger.error('Background update failed:', error);
  }
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

// Update the main processing flow
const fetchAndCacheSitemap = unstable_cache(
  async (url: string): Promise<ProcessedSitemapEntry[]> => {
    try {
      // 1. Get raw XML from Redis or external
      const { xml } = await getCachedOrFetchSitemap(url);
      
      // 2. Process XML
      const parsedEntries = await processSitemapXml(xml);
      
      // 3. Store processed entries
      await redis.set(`sitemap:${url}:entries`, parsedEntries);
      
      return parsedEntries;
    } catch (error) {
      logger.error('Sitemap processing error:', error);
      return [];
    }
  },
  ['sitemap-full'],
  { tags: ['sitemap'] }
);

// Update background refresh to use cached XML
async function backgroundRefresh(url: string) {
  try {
    // 1. Get raw XML from Redis only
    const xml = await redis.get<string>(getRawSitemapCacheKey(url)) || '';
    
    if (!xml) {
      logger.debug('No raw XML in cache, skipping background refresh');
      return;
    }
    
    // 2. Process cached XML
    const newEntries = await processSitemapXml(xml);
    const existingEntries = await redis.get<SitemapEntry[]>(`sitemap:${url}:entries`) || [];
    
    // 3. Merge and update
    const merged = [...newEntries, ...existingEntries];
    await redis.set(`sitemap:${url}:entries`, merged);
    
  } catch (error) {
    logger.error('Background refresh failed:', error);
  }
}

async function continueSitemapProcessing(url: string, startIndex: number): Promise<void> {
  const cacheKey = `sitemap:${url}`;
  const processedKey = `${cacheKey}:processed_count`;
  const completeKey = `${cacheKey}:complete`;
  const backgroundLockKey = `${cacheKey}:background_lock`;

  // Try to get background processing lock
  const lock = await redis.set(backgroundLockKey, '1', { nx: true, ex: 300 }); // 5 minute lock
  if (!lock) {
    logger.info('Background processing already running');
    return;
  }

  try {
    logger.info(`Starting background processing from index ${startIndex}`);
    
    const response = await fetch(url, {
      cache: 'force-cache',
      next: { 
        tags: ['sitemap'],
        revalidate: false
      }
    });
    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
    });
    
    const parsed = parser.parse(xml);
    const urlset = parsed.urlset?.url || [];
    const allUrls = Array.isArray(urlset) ? urlset : [urlset];
    
    const sortedUrls = allUrls
      .map(entry => ({
        loc: entry.loc?.trim() || '',
        lastmod: entry.lastmod?.trim() || new Date().toISOString()
      }))
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());

    logger.info(`Total URLs to process: ${sortedUrls.length - startIndex}`);

    // Process remaining URLs in batches
    for (let i = startIndex; i < sortedUrls.length; i += ITEMS_PER_PAGE) {
      const currentBatchStart = i;
      const currentBatchEnd = Math.min(i + ITEMS_PER_PAGE, sortedUrls.length);
      
      logger.info(`Processing batch ${currentBatchStart} to ${currentBatchEnd}`);

      const cachedEntries = await redis.get<SitemapEntry[]>(cacheKey) || [];
      const existingUrlSet = new Set(cachedEntries.map(entry => entry.url));
      
      const batchUrls = sortedUrls
        .slice(currentBatchStart, currentBatchEnd)
        .filter(entry => !existingUrlSet.has(entry.loc));

      if (batchUrls.length > 0) {
        logger.info(`Processing ${batchUrls.length} new URLs in current batch`);
        const newEntries = await processBatch(batchUrls);
        const validNewEntries = newEntries.filter((entry): entry is SitemapEntry => entry !== null);
        
        if (validNewEntries.length > 0) {
          const updatedEntries = [...cachedEntries, ...validNewEntries];
          const pipeline = redis.pipeline();
          pipeline.set(cacheKey, updatedEntries);
          pipeline.set(processedKey, currentBatchEnd);
          await pipeline.exec();
          
          logger.info(`Added ${validNewEntries.length} new entries to cache`);
        }
      }

      // Check if we should continue processing
      const shouldContinue = await redis.get<boolean>(backgroundLockKey);
      if (!shouldContinue) {
        logger.info('Background processing was interrupted');
        return;
      }

      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark processing as complete
    await redis.set(completeKey, true);
    logger.info('Background processing completed successfully');
  } catch (error) {
    logger.error('Error in background processing:', error);
  } finally {
    await redis.del(backgroundLockKey);
  }
}

// Define a type for parsed XML sitemap entries:
interface ParsedSitemapEntry {
  loc?: string;
  lastmod?: string;
}

// Add proper function wrapper
function processSitemapUrls(urlset: unknown): SitemapUrlEntry[] {
  // Add proper type checking
  return [];
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