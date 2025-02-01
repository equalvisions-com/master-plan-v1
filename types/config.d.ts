interface SiteConfig {
  readonly name: string;
  readonly url: string;
  readonly sitemapUrl: string;
  readonly description: string;
}

declare const config: {
  site: SiteConfig;
  // ... other config properties
};

export default config; 