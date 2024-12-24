export const cacheConfig = {
  ttl: 3600,
  staleWhileRevalidate: 7200,
  tags: {
    global: ['content', 'posts', 'categories'],
    category: (slug: string) => [`category:${slug}`],
    post: (slug: string) => [`post:${slug}`],
  },
  isr: {
    enabled: true,
    fallback: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  }
}; 