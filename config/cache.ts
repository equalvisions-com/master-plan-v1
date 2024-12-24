export const cacheConfig = {
  ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
  staleWhileRevalidate: 59,
  tags: {
    posts: 'posts',
    category: (slug: string) => `category:${slug}`,
    post: (slug: string) => `post:${slug}`,
    global: ['content', 'posts', 'categories']
  },
  headers: {
    cacheControl: (ttl: number) => 
      `public, s-maxage=${ttl}, stale-while-revalidate=59`,
    cdnCacheControl: (ttl: number) => 
      `public, max-age=${ttl}, stale-while-revalidate=59`,
  }
}; 