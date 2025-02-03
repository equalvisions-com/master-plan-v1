import { MetaTags, ApiMetaTag } from './sitemap-service'
import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis/client'

export async function fetchMetaTags(url: string): Promise<MetaTags | null> {
  try {
    if (!process.env.META_TAGS_API_KEY) {
      throw new Error('META_TAGS_API_KEY environment variable not configured');
    }

    // Normalize URL first
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      // Ensure www prefix consistency
      if (!parsedUrl.hostname.startsWith('www.')) {
        parsedUrl.hostname = `www.${parsedUrl.hostname}`;
      }
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }

    const finalUrl = parsedUrl.toString();
    const encodedUrl = encodeURIComponent(finalUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `https://api.apilayer.com/meta_tags?url=${encodedUrl}&proxy=true`,
      {
        headers: {
          'apikey': process.env.META_TAGS_API_KEY!,
        } as Record<string, string>,
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { 
      title: string; 
      meta_tags: Array<ApiMetaTag> 
    };
    
    const ogDescription = data.meta_tags.find((t: ApiMetaTag) => t.property === 'og:description')?.content;
    const ogImage = data.meta_tags.find((t: ApiMetaTag) => t.property === 'og:image')?.content;

    return {
      title: data.title || 'No title available',
      description: ogDescription || data.meta_tags.find((t: ApiMetaTag) => t.name === 'description')?.content || 'No description available',
      image: ogImage || ''
    };
  } catch {
    logger.error('Meta tag fetch failed:', {
      url,
      error: 'Unknown error'
    });
    return null;
  }
}

export async function fetchMetaTagsBatch(urls: string[]): Promise<Record<string, MetaTags>> {
  const cacheKeyBase = 'meta-tags:';
  const cacheKeys = urls.map(url => `${cacheKeyBase}${url}`);
  
  // Get cached entries
  const cachedEntries = await redis.mget<MetaTags[]>(...cacheKeys);
  
  const results: Record<string, MetaTags> = {};
  const toFetch: string[] = [];
  
  urls.forEach((url, index) => {
    if (cachedEntries[index]) {
      results[url] = cachedEntries[index];
    } else {
      toFetch.push(url);
    }
  });

  // Only process new URLs
  const batchResults = await fetchMetaTagsBatch(toFetch);
  
  // Cache new results indefinitely
  await Promise.all(
    Object.entries(batchResults).map(([url, meta]) =>
      redis.set(`${cacheKeyBase}${url}`, meta)
    )
  );

  return { ...results, ...batchResults };
}

export function someUtilityFunction(input: string): string {
  return input.trim();
} 