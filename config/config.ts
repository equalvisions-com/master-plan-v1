export const config = {
  api: {
    wordpress: {
      url: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
      perPage: 6,
      revalidate: 3600,
      webhook: {
        actions: ['publish', 'update', 'delete', 'trash'],
        secret: process.env.WORDPRESS_WEBHOOK_SECRET,
      }
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
  site: {
    name: process.env.NEXT_PUBLIC_SITE_NAME || 'Hampton Current',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://hamptoncurrent.com',
    description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Your site description',
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
    staleWhileRevalidate: 300,
    tags: {
      global: ['content'] as const,
      post: (slug: string) => `post:${slug}` as const,
      category: (slug: string) => `category:${slug}` as const,
    }
  }
} as const;

// Export type for use in other files
export type AppConfig = typeof config; 