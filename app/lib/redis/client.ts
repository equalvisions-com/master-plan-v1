import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

// Validate environment variables
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  logger.error('Redis configuration missing:', {
    url: !!REDIS_URL,
    token: !!REDIS_TOKEN
  });
  throw new Error(
    'Redis configuration is incomplete. Please check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
  );
}

// Create Redis client with proper error handling
export const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
  automaticDeserialization: true,
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.min(Math.exp(retryCount) * 50, 1000)
  }
});

// Test Redis connection
redis.ping().catch((error) => {
  logger.error('Redis connection failed:', error);
  throw new Error('Failed to connect to Redis');
});

// Helper function to safely parse JSON
function safeJSONParse<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

// Typed helper methods with proper error handling
export async function get<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (typeof data === 'string') {
      return safeJSONParse<T>(data);
    }
    return data as T | null;
  } catch (error) {
    logger.error('Redis get error:', { key, error });
    return null;
  }
}

export async function set<T>(
  key: string, 
  value: T, 
  options?: { ex?: number }
): Promise<void> {
  try {
    const serializedValue = JSON.stringify(value);
    if (options?.ex) {
      await redis.setex(key, options.ex, serializedValue);
    } else {
      await redis.set(key, serializedValue);
    }
  } catch (error) {
    logger.error('Redis set error:', { key, error });
  }
}

export async function setex<T>(
  key: string,
  seconds: number,
  value: T
): Promise<void> {
  try {
    const serializedValue = JSON.stringify(value);
    await redis.setex(key, seconds, serializedValue);
  } catch (error) {
    logger.error('Redis setex error:', { key, error });
  }
}

export async function del(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error('Redis del error:', { key, error });
  }
}

// Add a method to clear user's feed cache
export async function clearUserFeedCache(userId: string): Promise<void> {
  try {
    const userFeedKey = `user.${userId}.feed`;
    await redis.del(userFeedKey);
  } catch (error) {
    logger.error('Failed to clear user feed cache:', { userId, error });
  }
} 