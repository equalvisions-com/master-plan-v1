export const config = {
  site: {
    name: "Your Site Name",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    sitemapUrl: "/sitemap.xml",
    description: "Your site description here",
  },
  cache: {
    ttl: 60, // seconds
    staleWhileRevalidate: 30, // seconds
  },
  // ... other config properties
} as const;

export default config;