import { unstable_cache } from 'next/cache';
import { logger } from '@/lib/utils/logger';
import { config } from '@/config';

interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

// Simple cache implementation using Next.js cache
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const getter = unstable_cache(
        async () => {
          return null as T | null;
        },
        [key],
        { revalidate: config.cache.ttl }
      );
      
      return await getter();
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  async set<T>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      const setter = unstable_cache(
        async () => value,
        [key],
        {
          revalidate: options?.ttl ?? config.cache.ttl,
          tags: [...(options?.tags || []), 'content']
        }
      );
      
      await setter();
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }
};

// Export for backwards compatibility
export const redis = cache; 