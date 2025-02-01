export const config = {
  site: {
    name: "Your Site Name",
    url: process.env.SITE_URL,
    sitemapUrl: process.env.SITEMAP_URL || "https://yoursite.com/sitemap.xml",
    description: "Your site description here",
  },
  cache: {
    ttl: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
    tags: {
      global: ['content'] as const,
      post: (slug: string) => `post:${slug}` as const,
      category: (slug: string) => `category:${slug}` as const,
    }
  }
} as const;

export default config; 