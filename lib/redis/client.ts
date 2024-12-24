import { Redis, type SetCommandOptions } from '@upstash/redis'
import { Monitoring } from '@/lib/monitoring';

// Create a wrapper class instead of extending Redis
class MonitoredRedisClient {
  private redis: Redis;

  constructor(config: { url: string; token: string }) {
    this.redis = new Redis(config);
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    const result = await this.redis.get<T>(key);
    const duration = performance.now() - startTime;

    Monitoring.trackCacheEvent({
      type: result ? 'hit' : 'miss',
      key,
      source: 'redis',
      duration,
      size: result ? JSON.stringify(result).length : undefined
    });

    return result;
  }

  async set<T>(
    key: string, 
    value: T, 
    options?: SetCommandOptions
  ): Promise<T | "OK" | null> {
    const startTime = performance.now();
    const result = await this.redis.set(key, value, options);
    const duration = performance.now() - startTime;

    Monitoring.trackCacheEvent({
      type: 'hit',
      key,
      source: 'redis',
      duration,
      size: JSON.stringify(value).length
    });

    return result;
  }

  // Add other Redis methods as needed
}

export const redis = new MonitoredRedisClient({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
}); 