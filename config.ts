export const config = {
  site: {
    name: "Your Site Name",
    url: process.env.SITE_URL,
    sitemapUrl: process.env.SITEMAP_URL || "https://yoursite.com/sitemap.xml",
  },
  cache: {
    ttl: 3600, // 1 hour
    staleWhileRevalidate: 86400 // 24 hours
  }
} as const; 