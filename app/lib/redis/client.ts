import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error('UPSTASH_REDIS_REST_URL is not defined');
}

if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_TOKEN is not defined');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Add some helper methods for better error handling
export async function get<T>(key: string): Promise<T | null> {
  try {
    return await redis.get(key);
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function set<T>(
  key: string, 
  value: T, 
  options?: { ex?: number }
): Promise<void> {
  try {
    if (options?.ex) {
      await redis.setex(key, options.ex, value);
    } else {
      await redis.set(key, value);
    }
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function setex<T>(
  key: string,
  seconds: number,
  value: T
): Promise<void> {
  try {
    await redis.setex(key, seconds, value);
  } catch (error) {
    console.error('Redis setex error:', error);
  }
}

export async function del(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis del error:', error);
  }
} 