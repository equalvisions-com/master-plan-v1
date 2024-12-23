export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  tags: string[];
  ttl: number;
}

export interface CacheOptions {
  tags?: string[];
  ttl?: number;
} 