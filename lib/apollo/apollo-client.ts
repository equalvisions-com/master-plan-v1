import { ApolloClient, InMemoryCache, createHttpLink, NormalizedCacheObject } from '@apollo/client'
import { config } from '@/config'
import { cacheConfig } from './cache-config'

let client: ApolloClient<NormalizedCacheObject> | null = null

export function getClient() {
  if (!client || typeof window === 'undefined') {
    client = new ApolloClient({
      link: createHttpLink({
        uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
        fetchOptions: {
          cache: 'force-cache',
          next: { 
            revalidate: config.cache.ttl
          }
        },
      }),
      cache: new InMemoryCache({
        ...cacheConfig,
        possibleTypes: {
          Post: ['Post'],
          Category: ['Category']
        }
      }),
      defaultOptions: {
        query: {
          fetchPolicy: 'cache-first',
        },
      },
    })
  }
  return client
} 