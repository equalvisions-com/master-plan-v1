import { Redis } from '@upstash/redis'
import { config } from '@/config'
import { logger } from '@/lib/logger'
import type { WordPressPost } from '@/types/wordpress'
import { SitemapEntry } from './types'
import { XMLParser } from 'fast-xml-parser'
import { redis, isValidUrl, createCacheKey } from '@/lib/redis/client'
import { revalidateTag } from 'next/cache'
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

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const ITEMS_PER_PAGE = 10;
const CACHE_TTL = 24 * 60 * 60; // 24 hours

// Add API key validation at the top
if (!process.env.META_TAGS_API_KEY) {
  throw new Error('META_TAGS_API_KEY environment variable is not set');
}

// Add rate limiting for meta tag fetching
const META_TAGS_RATE_LIMIT = 5; // Requests per second
const META_TAGS_QUEUE: Array<() => Promise<void>> = [];
let lastRequestTime = 0;

// Add at the top near other constants
const SITEMAP_CACHE_TTL = 86400; // 24 hours in seconds
const PROCESSED_PAGE_SIZE = 10;

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

// Increase batch size and concurrency to speed up processing on first render
const BATCH_SIZE = 10; // Increased items per batch
const MAX_CONCURRENT_BATCHES = 4; // Increased number of batches processed concurrently

// Add type for the batch processing
async function processBatch(entries: SitemapUrlEntry[]): Promise<SitemapEntry[]> {
  const processed: SitemapEntry[] = [];
  
  try {
    // 1. Attempt to retrieve cached meta for each entry from Redis
    const cacheKeys = entries.map(e => `meta-tags:${e.loc}`);
    const cachedMetaTags = await redis.mget<(MetaTags | null)[]>(...cacheKeys) || [];

    // 2. Build a list of URLs that still need fetching
    const toFetch: SitemapUrlEntry[] = [];
    const metaResults: Record<string, MetaTags> = {};

    entries.forEach((entry, idx) => {
      const cached = cachedMetaTags?.[idx];
      if (cached && 'title' in cached && 'description' in cached) {
        metaResults[entry.loc] = cached;
      } else {
        toFetch.push(entry);
      }
    });

    // 3. For any URLs not in Redis, call the external meta tags API
    if (toFetch.length > 0) {
      const fetchedResults = await fetchMetaTagsBatch(toFetch.map(e => e.loc));
      Object.assign(metaResults, fetchedResults);
    }

    // 4. Construct final processed entries (cached + newly fetched)
    for (const entry of entries) {
      const meta = metaResults[entry.loc];
      if (meta) {
        processed.push({
          url: entry.loc,
          lastmod: normalizeDate(entry.lastmod),
          meta: {
            title: meta.title,
            description: meta.description,
            image: meta.image
          }
        });
      }
    }
  } catch (error) {
    logger.error('Batch processing failed:', error);
  }
  
  return processed;
}

// Add Redis pipeline configuration
interface PipelineOptions {
  cache?: 'force-cache' | 'no-store';
  revalidate?: number | false;
  tags?: string[];
}

// Update the pipeline operations with caching
async function executeRedisPipeline(pipeline: any, options?: PipelineOptions) {
  const pipelineConfig = {
    cache: options?.cache || 'force-cache',
    next: {
      revalidate: options?.revalidate === undefined ? false : options?.revalidate,
      tags: options?.tags || ['redis']
    }
  };

  return pipeline.exec(pipelineConfig);
}

// Gets the latest processed lastmod date
async function getLatestProcessedLastmod(url: string): Promise<Date> {
  const processedKey = `sitemap:${url}:processed`;
  const entries = await redis.get<SitemapEntry[]>(processedKey) || [];
  return entries.length > 0 
    ? new Date(entries[0].lastmod) 
    : new Date(0); // Epoch if no entries
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

// Add rate limiting helper
const rateLimiter = {
  queue: [] as (() => Promise<void>)[],
  processing: false,
  delay: 100, // ms between requests

  async add(task: () => Promise<void>) {
    this.queue.push(task);
    if (!this.processing) {
      this.processing = true;
      await this.process();
    }
  },

  async process() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
    this.processing = false;
  }
};

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

async function processSitemapBatchInBackground(
  url: string,
  remainingUrls: SitemapUrlEntry[],
  existingEntries: SitemapEntry[],
  processedUrls: Set<string>
) {
  const cacheKey = `sitemap:${url}`;
  const processedKey = `${cacheKey}:processed`;
  const lockKey = `${cacheKey}:lock`;
  const ITEMS_PER_PAGE = 10;

  const lock = await redis.set(lockKey, '1', { nx: true, ex: 60 });
  if (!lock) return;

  try {
    for (let i = 0; i < remainingUrls.length; i += ITEMS_PER_PAGE) {
      const batch = remainingUrls.slice(i, i + ITEMS_PER_PAGE)
        .filter(entry => !processedUrls.has(entry.loc));

      if (batch.length > 0) {
        const newEntries = await processBatch(batch);
        if (newEntries.length) {
          existingEntries.push(...newEntries);
          newEntries.forEach(entry => processedUrls.add(entry.url));
          await redis.set(cacheKey, existingEntries);
        }
      }

      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark as fully processed when done
    await redis.set(processedKey, true);
  } finally {
    await redis.del(lockKey);
  }
}

async function fetchAndProcessSitemap(url: string): Promise<SitemapEntry[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch sitemap: ${response.statusText}`);

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
    });
    
    const parsed = parser.parse(xml);
    const urlset = parsed.urlset?.url || [];
    const urls = Array.isArray(urlset) ? urlset : [urlset];

    return processBatchesWithConcurrency(urls.map(entry => ({
      loc: entry.loc?.trim(),
      lastmod: entry.lastmod?.trim() || new Date().toISOString()
    })));
  } catch (error) {
    logger.error('Error fetching/parsing sitemap:', error);
    return [];
  }
}

// Add URL validation
if (!process.env.META_TAGS_API_KEY) {
  throw new Error('META_TAGS_API_KEY environment variable is not set');
}

async function fetchMetaTagsWithRateLimit(url: string) {
  if (!isValidUrl(url)) {
    logger.warn('Invalid URL provided to fetchMetaTags', { url });
    return null;
  }

  // Add request to queue
  return new Promise((resolve) => {
    META_TAGS_QUEUE.push(async () => {
      try {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < 1000 / META_TAGS_RATE_LIMIT) {
          await new Promise(r => setTimeout(r, 1000 / META_TAGS_RATE_LIMIT - timeSinceLastRequest));
        }
        lastRequestTime = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
          `https://api.apilayer.com/meta_tags?url=${encodeURIComponent(url)}`,
      {
        headers: {
              'apikey': process.env.META_TAGS_API_KEY!,
            },
            signal: controller.signal,
            cache: 'force-cache',
            next: {
              revalidate: false
            }
          }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            // If rate limited, wait and retry
            await new Promise(r => setTimeout(r, 2000));
            return resolve(fetchMetaTagsWithRateLimit(url));
          }
          throw new Error(`API request failed: ${response.status}`);
        }
    
    const data = await response.json();
        resolve({
          title: data.title || 'No title available',
          description: data.meta_tags?.find((t: any) => t.name === 'description')?.content || 'No description available',
          image: data.meta_tags?.find((t: any) => t.property === 'og:image')?.content || ''
        });
      } catch (error) {
        logger.error('Meta tag fetch failed:', { url, error });
        resolve(null);
      }
    });

    // Process queue
    if (META_TAGS_QUEUE.length === 1) {
      processQueue();
    }
  });
}

async function processQueue() {
  while (META_TAGS_QUEUE.length > 0) {
    const request = META_TAGS_QUEUE[0];
    await request();
    META_TAGS_QUEUE.shift();
  }
}

export type { SitemapEntry } from './types';

// Add the missing fetchSitemapUrls function
async function fetchSitemapUrls(url: string): Promise<SitemapUrlEntry[]> {
  try {
    // Unify key usage
    const rawCacheKey = getRawSitemapCacheKey(url);
    let xml = await redis.get<string>(rawCacheKey);
    
    if (!xml) {
      const response = await fetch(url, {
        cache: 'force-cache',
        next: { 
          tags: ['sitemap']
        }
      });
      xml = await response.text();
      await redis.set(rawCacheKey, xml);
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
    });
    
    const parsed = parser.parse(xml);
    const urlset = parsed.urlset?.url || [];
    const urls = Array.isArray(urlset) ? urlset : [urlset];

    return urls.map((entry: any) => ({
      loc: entry.loc?.trim() || '',
      lastmod: entry.lastmod?.trim() || new Date().toISOString()
    })).filter((entry): entry is SitemapUrlEntry => 
      Boolean(entry.loc) && Boolean(entry.lastmod)
    );
  } catch (error) {
    logger.error('Error fetching sitemap URLs:', error);
    return [];
  }
}

// Fix the processBatchesWithConcurrency function signature
async function processBatchesWithConcurrency(urls: SitemapUrlEntry[]): Promise<SitemapEntry[]> {
  const results: SitemapEntry[] = [];
  
  for (let i = 0; i < urls.length; i += BATCH_SIZE * MAX_CONCURRENT_BATCHES) {
    const batchPromises = [];
    
    for (let j = 0; j < MAX_CONCURRENT_BATCHES && i + j * BATCH_SIZE < urls.length; j++) {
      const start = i + j * BATCH_SIZE;
      const batch = urls.slice(start, start + BATCH_SIZE);

      if (batch.length > 0) {
        const promise = new Promise<SitemapEntry[]>(resolve => 
          setTimeout(() => resolve(processBatch(batch)), j * 100)
        );
        batchPromises.push(promise);
      }
    }

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
  }

  return results;
}

export class SitemapService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      automaticDeserialization: true,
    });
  }

  async getEntries(url: string): Promise<SitemapEntry[]> {
    const cacheKey = createCacheKey('sitemap', url);

    try {
      const cached = await this.redis.get<SitemapEntry[]>(cacheKey);
      if (cached?.length) {
        return cached;
      }

      const entries = await this.fetchAndParseSitemap(url);
      
      if (entries.length) {
        await this.redis.set(cacheKey, entries);
      }

      return entries;
    } catch (error) {
      logger.error('Sitemap service error:', error);
      return [];
    }
  }

  private async fetchAndParseSitemap(url: string): Promise<SitemapEntry[]> {
    try {
      const response = await fetch(url, {
        cache: 'force-cache',
        next: { 
          tags: ['sitemap']
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
      }

      const { xml } = await getCachedOrFetchSitemap(url);
      const processed = processSitemapXml(xml);
      
      if (processed.length) {
        await this.redis.set(`sitemap:${url}:entries`, processed);
      }

      return processed;
    } catch (error) {
      logger.error('Error fetching/parsing sitemap:', error);
      return [];
    }
  }
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        cache: 'force-cache',
        next: { 
          tags: ['sitemap']
        }
      });
      
      if (response.ok) return response;
      
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
  throw new Error('Unreachable code');
}

// Fix the sorting function with proper types
async function fetchSitemapEntriesForPage(url: string, page: number): Promise<SitemapEntry[]> {
  try {
    const response = await fetch(url);
    const xml = await response.text();
    const parser = new XMLParser();
    const result = parser.parse(xml);
    
    const allEntries = (result.urlset?.url || [])
      .map((entry: SitemapUrlEntry) => ({
        url: entry.loc,
        lastmod: new Date(entry.lastmod || new Date()).toISOString()
      }))
      .sort((a: ProcessedSitemapEntry, b: ProcessedSitemapEntry) => 
        new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
      );

    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageEntries = allEntries.slice(start, end);
    
    // If we're short on entries, pad with fallbacks
    if (pageEntries.length < ITEMS_PER_PAGE) {
      const needed = ITEMS_PER_PAGE - pageEntries.length;
      const fallbacks = await getFallbackEntries(needed);
      pageEntries.push(...fallbacks);
    }
    
    return pageEntries;
  } catch (error) {
    logger.error('Error fetching sitemap entries:', error);
    return [];
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

async function getFallbackEntries(count: number): Promise<SitemapEntry[]> {
  const fallbackKey = 'sitemap:fallback-entries';
  try {
    // Get cached fallbacks
    const cached = await redis.get<SitemapEntry[]>(fallbackKey) || [];
    if (cached.length >= count) return cached.slice(0, count);
    
    // Generate new fallbacks if needed
    const needed = count - cached.length;
    const newFallbacks = Array(needed).fill(null).map((_, i) => ({
      url: `/fallback/${Date.now()}-${i}`,
      lastmod: new Date().toISOString(),
      meta: {
        title: 'Featured Post',
        description: 'Explore more content'
      }
    }));
    
    // Update cache with new fallbacks
    await redis.set(fallbackKey, [...cached, ...newFallbacks]);
    
    return [...cached, ...newFallbacks].slice(0, count);
  } catch (error) {
    logger.error('Fallback generation failed:', error);
    return [];
  }
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
    // Map parsed entries so that:
    //   - "loc" is renamed to "url"
    //   - "lastmod" is used or defaulted
    //   - add a default meta object (with empty fields) since it's required by SitemapEntry
    return (parsed.urlset?.url || []).map((entry: any) => ({
      url: entry.loc, 
      lastmod: entry.lastmod || new Date().toISOString(),
      meta: {
        title: '',
        description: '',
        image: undefined
      }
    }));
  } catch (error) {
    logger.error('XML processing failed:', error);
    return [];
  }
} 