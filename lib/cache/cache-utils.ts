import { unstable_cache } from 'next/cache';
import { config } from '@/config';

export const cacheConfig = {
  revalidate: config.cache.ttl,
  tags: ['content']
};

export function createCacheKey(prefix: string, ...args: any[]): string {
  return `${prefix}:${args.join(':')}`;
}