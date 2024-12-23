import { kv } from '@vercel/kv';
import { logger } from '@/lib/logger';

interface CacheOperation {
  [key: string]: string | number | boolean;
  key: string;
  success: boolean;
  timestamp: number;
}

export const cacheHandler = {
  async trackCacheOperation(key: string, success: boolean) {
    try {
      const operation: CacheOperation = {
        key,
        success,
        timestamp: Date.now()
      }
      
      const operations = await kv.get<string[]>('cache:operations') || []
      operations.unshift(JSON.stringify(operation))
      operations.splice(100)
      await kv.set('cache:operations', operations)
      
      logger.info('Cache operation tracked:', operation as Record<string, unknown>)
    } catch (error) {
      logger.error('Error tracking cache operation:', error)
    }
  }
} 