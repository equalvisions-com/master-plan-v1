import { ApolloClient, InMemoryCache, NormalizedCacheObject, from, HttpLink } from "@apollo/client";
import { config } from '@/config';
import { RetryLink } from "@apollo/client/link/retry";

// Implement singleton pattern
let apolloClient: ApolloClient<NormalizedCacheObject>;

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
  credentials: 'same-origin'
});

const retryLink = new RetryLink({
  attempts: {
    max: 3,
    retryIf: (error) => !!error && error.statusCode !== 404
  }
});

export async function getClient() {
  if (apolloClient) return apolloClient;
  
  apolloClient = new ApolloClient({
    uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            posts: {
              keyArgs: ['first', 'after', 'where'],
              merge(existing = { nodes: [] }, incoming = { nodes: [] }, { args }) {
                if (!args?.after) return incoming;
                return {
                  ...incoming,
                  nodes: [...existing.nodes, ...incoming.nodes].filter(
                    (node, index, self) => 
                      index === self.findIndex((t) => t.id === node.id)
                  )
                };
              }
            },
            seo: {
              merge: true,
            }
          }
        }
      }
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
        context: {
          fetchOptions: {
            next: {
              revalidate: config.cache.ttl,
              tags: ['posts']
            },
            cache: 'force-cache'
          }
        }
      }
    },
    link: from([retryLink, httpLink])
  });
  
  return apolloClient;
} 