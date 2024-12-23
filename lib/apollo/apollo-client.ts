import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { config } from '@/config'

let client: ApolloClient<any> | null = null

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
      cache: new InMemoryCache(),
      defaultOptions: {
        query: {
          fetchPolicy: 'cache-first',
        },
      },
    })
  }
  return client
} 