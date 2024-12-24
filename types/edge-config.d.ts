declare module '@vercel/edge-config' {
  export interface EdgeConfigClient {
    get<T>(key: string): Promise<T>;
    has(key: string): Promise<boolean>;
    digest(): Promise<string>;
  }

  export interface CacheConfig {
    ttl: number;
    staleWhileRevalidate?: number;
    tags?: string[];
  }

  export interface FeatureFlags {
    [key: string]: boolean;
  }

  export interface SiteSettings {
    [key: string]: unknown;
  }

  export function createClient(token?: string): EdgeConfigClient;
} 