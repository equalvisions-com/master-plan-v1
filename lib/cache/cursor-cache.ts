import { unstable_cache } from 'next/cache';
import { config } from '@/config';

export class CursorCache {
  static storeCursor = unstable_cache(
    async (key: string, pageNum: number, cursor: string | null) => {
      if (!cursor) return null;
      return { cursor, pageNum };
    },
    ['cursor-cache'],
    { revalidate: config.cache.ttl }
  );

  static getCursor = unstable_cache(
    async (key: string, pageNum: number) => {
      if (pageNum === 1) return null;
      return null; // Will be populated after first page fetch
    },
    ['cursor-cache'],
    { revalidate: config.cache.ttl }
  );
} 