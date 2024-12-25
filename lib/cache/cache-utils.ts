import { unstable_cache } from 'next/cache';
import { config } from '@/config';

type CacheKeyValue = string | number | boolean | null | undefined;

export const cacheConfig = {
  revalidate: config.cache.ttl,
  tags: ['content'] as const
};

export function createCacheKey(prefix: string, ...args: CacheKeyValue[]): string {
  return `${prefix}:${args.join(':')}`;
}

// Helper function to wrap data fetching with cache
export function createCachedFetch<T>(
  key: string,
  fn: () => Promise<T>,
  options?: {
    tags?: string[];
    revalidate?: number;
  }
) {
  return unstable_cache(
    fn,
    [key],
    {
      revalidate: options?.revalidate ?? config.cache.ttl,
      tags: [...(options?.tags ?? []), ...cacheConfig.tags]
    }
  );
}