import { ApolloClient, InMemoryCache, NormalizedCacheObject, from, HttpLink, ApolloError } from "@apollo/client";
import { config } from '@/config';
import { RetryLink } from "@apollo/client/link/retry";

// Define types for our nodes
interface Node {
  id: string;
  [key: string]: any;
}

interface NodesResponse {
  nodes: Node[];
}

// Implement singleton pattern
let apolloClient: ApolloClient<NormalizedCacheObject>;

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
  credentials: 'same-origin',
  fetchOptions: {
    cache: 'force-cache'
  }
});

const retryLink = new RetryLink({
  attempts: {
    max: 3,
    retryIf: (error: ApolloError | undefined) => {
      // Don't retry on 404s or if no error
      if (!error || error.statusCode === 404) return false;
      // Don't retry on specific GraphQL errors
      if (error.response?.errors?.[0]?.extensions?.code === 'INVALID_SLUG') return false;
      return true;
    }
  },
  delay: {
    initial: 300, // 300ms initial delay
    max: 2000,    // Max 2s delay between retries
    jitter: true  // Add randomness to delays
  }
});

export async function getClient() {
  if (apolloClient) return apolloClient;
  
  apolloClient = new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            posts: {
              keyArgs: ['first', 'after', 'where'],
              merge(existing: NodesResponse = { nodes: [] }, 
                   incoming: NodesResponse = { nodes: [] }, 
                   { args }: { args: { after?: string } }) {
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
      },
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'all'
      }
    },
    link: from([retryLink, httpLink])
  });
  
  return apolloClient;
} 