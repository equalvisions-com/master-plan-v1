import { logger } from '@/lib/logger'
import { MetaTags } from './sitemap-service';

/** @internal */
export interface ApiMetaTag {
  property?: string;
  name?: string;
  content: string;
}

export async function fetchMetaTags(url: string): Promise<MetaTags> {
  try {
    if (!process.env.META_TAGS_API_KEY) {
      throw new Error('META_TAGS_API_KEY environment variable not configured');
    }

    // Enhanced URL normalization with protocol validation
    let parsedUrl: URL;
    try {
      // Remove all protocol prefixes and whitespace
      const sanitized = url
        .replace(/^[a-z]+:\/\//i, '')  // Remove any existing protocol
        .replace(/^\/+/g, '')          // Remove leading slashes
        .replace(/\s+/g, '')           // Remove whitespace
        .replace(/:+/g, '')            // Remove colons that might create false protocols
        .replace(/^https?/i, '');       // Remove any remaining protocol fragments

      // Validate we have a viable hostname
      if (!sanitized || sanitized.startsWith('/') || !sanitized.includes('.')) {
        throw new Error(`Invalid URL structure: ${url}`);
      }

      parsedUrl = new URL(`https://${sanitized}`);
      
      // Validate domain components
      const hostParts = parsedUrl.hostname.split('.');
      const isValidHost = hostParts.length >= 2 && 
                         !['http', 'https', 'www'].includes(hostParts[0]) &&
                         hostParts.every(part => part.length > 0);

      if (!isValidHost) {
        throw new Error(`Invalid domain structure: ${parsedUrl.hostname}`);
      }
    } catch (error) {
      logger.error('URL validation failed:', { originalUrl: url, error });
      return {
        title: url,
        description: '',
        image: ''
      };
    }

    // Step 2: Make API request
    const encodedUrl = encodeURIComponent(parsedUrl.toString());
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `https://api.apilayer.com/meta_tags?url=${encodedUrl}&proxy=true`,
        {
          headers: { 'apikey': process.env.META_TAGS_API_KEY! },
          signal: controller.signal,
          next: { revalidate: 3600 }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      // Step 3: Process response
      const data = await response.json() as { 
        title: string; 
        meta_tags: Array<{ property?: string; name?: string; content: string }> 
      };

      const ogDescription = data.meta_tags.find(t => t.property === 'og:description')?.content;
      const ogImage = data.meta_tags.find(t => t.property === 'og:image')?.content;

      return {
        title: data.title || parsedUrl.hostname,
        description: ogDescription || '',
        image: ogImage || ''
      };
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error('Meta tag fetch failed:', {
        url: parsedUrl.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        title: parsedUrl.hostname,
        description: '',
        image: ''
      };
    }
  } catch (error) {
    logger.error('Unexpected error in fetchMetaTags:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      title: url,
      description: '',
      image: ''
    };
  }
}

export async function fetchMetaTagsBatch(urls: string[]): Promise<Record<string, MetaTags>> {
  const results: Record<string, MetaTags> = {};
  
  // Process URLs in parallel with a limit
  const batchPromises = urls.map(async (url) => {
    try {
      const meta = await fetchMetaTags(url);
      if (meta) {
        results[url] = meta;
      }
    } catch (error) {
      logger.error('Failed to fetch meta for URL:', { url, error });
      // Provide fallback meta data
      results[url] = {
        title: url,
        description: '',
        image: ''
      };
    }
  });

  await Promise.all(batchPromises);
  return results;
}

export function someUtilityFunction(input: string): string {
  return input.trim();
} 