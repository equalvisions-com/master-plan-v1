import { Redis } from '@upstash/redis';

// Validate environment variables
if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error('UPSTASH_REDIS_REST_URL is not defined');
}

if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_TOKEN is not defined');
}

// Update the Redis client to use the custom fetch
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  // Remove unsupported properties
  // automaticDeserialization: true,  // Not needed, handled automatically
  // headers: { ... }                 // Not supported by Upstash client
});

// Add URL validation helper
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol.startsWith('http') && 
           parsed.hostname.length > 0 && 
           parsed.hostname !== 'https' &&
           parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

// Add safe key generation
export function createCacheKey(prefix: string, value: string): string {
  // Remove any potential invalid characters from keys
  const sanitized = value.replace(/[^a-zA-Z0-9-_:.]/g, '_');
  return `${prefix}:${sanitized}`;
}

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
    // Use proper Redis SET options type with conditional spread
    const redisOptions = options?.ttl ? { ex: options.ttl } : undefined;
    
    await redis.set(key, value, redisOptions);
  } catch (error) {
    console.error('Error setting cache:', error);
    throw error;
  }
}

// Add implementation comment for pipeline executor
export async function executeRedisPipeline(
  // Remove unused parameter until implementation
): Promise<unknown[]> {
  // TODO: Implement Redis pipeline execution
  return [];
}

export { redis }; 