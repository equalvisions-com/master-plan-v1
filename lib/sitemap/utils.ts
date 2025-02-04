import { logger } from '@/lib/logger'
import { MetaTags } from './sitemap-service';
import { normalizeUrl } from '@/lib/utils/normalizeUrl'

/** @internal */
export interface ApiMetaTag {
  property?: string;
  name?: string;
  content: string;
}

export async function fetchMetaTags(url: string): Promise<MetaTags> {
  const normalizedUrl = normalizeUrl(url);
  if (normalizedUrl === "https" || normalizedUrl === "https:") {
    return { title: '', description: '', image: '' };
  }
  if (!normalizedUrl) {
    return { title: '', description: '', image: '' };
  }
  const parsedUrl = new URL(normalizedUrl);
  const encodedUrl = encodeURIComponent(parsedUrl.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    if (!parsedUrl.hostname.includes('.')) {
      throw new Error(`Invalid hostname: ${parsedUrl.hostname}`);
    }
    
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
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    // Convert error to a safe object for property access
    const errorObj = (typeof error === 'object' && error !== null)
      ? error as Record<string, unknown>
      : {};
    if (typeof errorObj.code === 'string' && errorObj.code === 'ENOTFOUND') {
      logger.error("DNS resolution failed (getaddrinfo):", {
        url: parsedUrl.toString(),
        hostname: errorObj.hostname,
        errno: errorObj.errno,
        code: errorObj.code,
        syscall: errorObj.syscall
      });
    }
    let errorDetails: Record<string, unknown> = {};
    if (error instanceof Error) {
      errorDetails = {
        message: error.message,
        stack: error.stack,
        errno: errorObj.errno,
        code: errorObj.code,
        syscall: errorObj.syscall,
        hostname: errorObj.hostname,
        cause: errorObj.cause
      };
    } else {
      errorDetails = { error };
    }
    logger.error("Meta tag fetch failed - Detailed error info:", {
      url: parsedUrl.toString(),
      errorDetails
    });
    return {
      title: parsedUrl.hostname,
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