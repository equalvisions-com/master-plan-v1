interface CacheConfig {
  readonly ttl: number;
  readonly staleWhileRevalidate: number;
  readonly tags: {
    global: readonly string[];
    post: (slug: string) => string;
    category: (slug: string) => string;
  };
}

interface SiteConfig {
  readonly name: string;
  readonly url: string;
  readonly sitemapUrl: string;
  readonly description: string;
}

declare const config: {
  site: SiteConfig;
  cache: CacheConfig;
  // ... other config properties
};

export default config;