import { Monitoring } from '@/lib/monitoring';

type CacheSource = 'next' | 'apollo' | 'redis' | 'vercel' | 'isr' | 'revalidate';

export const cacheMonitor = {
  logCacheHit(key: string, source: CacheSource, duration?: number) {
    Monitoring.trackCacheEvent({
      type: 'hit',
      key,
      source,
      duration: duration || 0
    });
  },

  logCacheMiss(key: string, source: CacheSource, duration?: number) {
    Monitoring.trackCacheEvent({
      type: 'miss',
      key,
      source,
      duration: duration || 0
    });
  },

  logRevalidate(tags: string[], success: boolean) {
    tags.forEach(tag => {
      Monitoring.trackCacheEvent({
        type: success ? 'hit' : 'miss',
        key: tag,
        source: 'revalidate',
        duration: 0
      });
    });
  }
}; 