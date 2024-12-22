// Create a shared config file
export const defaultApolloOptions = {
  context: {
    fetchOptions: {
      next: { 
        revalidate: 3600,
        tags: [],
      },
      maxQuerySize: 1000000, // 1MB
      maxCacheSize: 5000000, // 5MB
    },
  },
};

export function createQueryOptions(slug: string, tags: string[]) {
  return {
    context: {
      fetchOptions: {
        next: { 
          revalidate: 3600,
          tags: [...tags, `post:${slug}`],
        },
        cache: 'force-cache',
      },
    },
  };
} 

export const cacheConfig = {
  typePolicies: {
    Post: {
      keyFields: (obj: { contentType?: string; id: string }) => 
        `Post:${obj.contentType || 'default'}:${obj.id}`,
      fields: {
        content: {
          merge: true,
          maxAge: 3600
        }
      }
    }
  }
}; 