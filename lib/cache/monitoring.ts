import { logger } from '@/lib/utils/logger';

interface CacheEvent {
  key: string;
  source: 'next' | 'isr';
  duration: number;
  size?: number;
}

export const cacheMonitor = {
  logCacheHit({ key, source, duration, size }: CacheEvent) {
    logger.debug(`[Cache ${source}] hit: ${key} (${duration.toFixed(2)}ms)${size ? ` size: ${size}` : ''}`);
  },

  logCacheMiss({ key, source, duration }: CacheEvent) {
    logger.debug(`[Cache ${source}] miss: ${key} (${duration.toFixed(2)}ms)`);
  }
}; 