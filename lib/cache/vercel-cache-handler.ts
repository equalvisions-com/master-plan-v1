import { revalidateTags } from '@/lib/actions'
import { config } from '@/config'
import { kv } from '@vercel/kv'
import { logger } from '@/lib/logger'

const logDebug = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SEO === 'true') {
    logger.info(message, data);
  }
};

interface CacheOptions {
  tags: string[];
  ttl?: number;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class VercelCacheHandler {
  private static instance: VercelCacheHandler | null = null;
  private cacheAnalytics: Map<string, { hits: number; misses: number }>;

  private constructor() {
    this.cacheAnalytics = new Map();
  }

  public static getInstance(): VercelCacheHandler {
    if (!VercelCacheHandler.instance) {
      VercelCacheHandler.instance = new VercelCacheHandler();
    }
    return VercelCacheHandler.instance;
  }

  public async revalidateWithCircuitBreaker(tags: string[], maxRetries = 3): Promise<void> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const result = await revalidateTags(tags)
        if (result.success) return;
        throw result.error
      } catch (error: unknown) {
        retries++;
        if (retries === maxRetries) {
          logger.error('Circuit breaker triggered: Max retries reached for cache revalidation');
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
  }

  public trackCacheOperation(key: string, hit: boolean): void {
    const stats = this.cacheAnalytics.get(key) ?? { hits: 0, misses: 0 };
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    this.cacheAnalytics.set(key, stats);

    logDebug(`Cache ${hit ? 'hit' : 'miss'} for ${key}`, stats);
  }

  public async warmCache<T>(keys: string[], fetchFn: (key: string) => Promise<T>): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        try {
          await fetchFn(key);
          logDebug(`Cache warmed for ${key}`);
        } catch (error) {
          logger.error(`Cache warming failed for ${key}:`, error);
        }
      })
    );
  }

  public async revalidateWithISR(slug: string, options: {
    immediate?: boolean;
    tags?: string[];
  } = {}): Promise<void> {
    const { immediate = true, tags = [] } = options;
    
    // Add default tags if not provided
    const defaultTags = [
      `post:${slug}`,
      'posts',
      'content',
      ...config.cache.tags.global
    ];

    const allTags = [...new Set([...defaultTags, ...tags])];

    logger.info('Revalidating cache:', {
      slug,
      immediate,
      tags: allTags
    });

    if (immediate) {
      await this.revalidateWithCircuitBreaker(allTags);
    } else {
      void Promise.resolve().then(() => {
        this.revalidateWithCircuitBreaker(allTags).catch(error => {
          logger.error('Background revalidation failed:', error);
        });
      });
    }
  }

  // Add method for handling stale-while-revalidate
  public async getWithSWR<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached) {
        // Track cache hit
        this.trackCacheOperation(key, true);
        
        // Trigger background revalidation if stale
        const isStale = this.isStale(cached);
        if (isStale) {
          void this.revalidateWithISR(key, { immediate: false });
        }
        return cached.data;
      }
      
      // Cache miss - fetch fresh data
      this.trackCacheOperation(key, false);
      const fresh = await fetchFn();
      if (!fresh) {
        logger.warn(`No data found for key: ${key}`);
        return null as T;
      }
      
      await this.set(key, fresh);
      return fresh;
    } catch (error) {
      logger.error('Cache operation failed:', error);
      // Attempt direct fetch as fallback
      return fetchFn().catch(fetchError => {
        logger.error('Fallback fetch failed:', fetchError);
        return null as T;
      });
    }
  }

  // Add the missing methods
  private async get<T>(key: string): Promise<CachedData<T> | null> {
    try {
      const data = await kv.get<CachedData<T>>(key);
      return data;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  private async set<T>(key: string, data: T, ttl = config.cache.ttl): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      await kv.set(key, cachedData, { ex: ttl });
      logDebug(`Cache set for ${key}`, { ttl });
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  private isStale<T>(cached: CachedData<T>): boolean {
    const age = Date.now() - cached.timestamp;
    return age > cached.ttl;
  }

  public async revalidateContent(slug: string) {
    try {
      await revalidateTags([
        `post:${slug}`,
        'posts',
        'content'
      ]);
      
      return { revalidated: true };
    } catch (error) {
      logger.error('Revalidation failed:', error);
      return { revalidated: false, error };
    }
  }
}

export const cacheHandler = VercelCacheHandler.getInstance(); 