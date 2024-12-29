import { Redis, SetCommandOptions } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_URL) {
  throw new Error('UPSTASH_REDIS_URL is not defined')
}

if (!process.env.UPSTASH_REDIS_TOKEN) {
  throw new Error('UPSTASH_REDIS_TOKEN is not defined')
}

// Create a type-safe Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
}) as Redis;

// Add type safety for common Redis operations
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    // Upstash Redis client automatically handles JSON parsing
    const data = await redis.get<T>(key);
    return data;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

export async function setInCache<T>(
  key: string, 
  value: T, 
  options?: { ttl?: number }
): Promise<void> {
  try {
    const redisOptions: SetCommandOptions | undefined = options?.ttl 
      ? { ex: options.ttl }
      : undefined;

    // Upstash Redis client automatically handles JSON stringification
    await redis.set(key, value, redisOptions);
  } catch (error) {
    console.error('Error setting cache:', error);
    throw error;
  }
} 