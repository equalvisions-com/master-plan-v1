import { 
  ApolloClient, 
  InMemoryCache, 
  HttpLink, 
  from, 
  ApolloLink,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { logger } from '@/lib/logger';
import { Monitoring } from '@/lib/monitoring';

const authString = Buffer.from(
  `${process.env.WP_USER}:${process.env.WP_APP_PASS}`
).toString('base64');

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL,
  headers: {
    'Authorization': `Basic ${authString}`,
    'Content-Type': 'application/json',
  },
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? new URL(input) : input;
    return fetch(url, {
      ...init,
      next: { revalidate: 3600 }
    });
  }
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      logger.error('GraphQL Error:', { message, locations, path });
    });
  }
  if (networkError) {
    logger.error('Network Error:', networkError);
  }
});

const monitoringLink = new ApolloLink((operation, forward) => {
  if (!forward) return null;

  const startTime = performance.now();
  
  return forward(operation).map((response) => {
    try {
      const duration = performance.now() - startTime;
      
      if (operation.operationName) {
        Monitoring.trackCacheEvent({
          type: response.data ? 'hit' : 'miss',
          key: `${operation.operationName}:${JSON.stringify(operation.variables)}`,
          source: 'apollo',
          duration,
          size: response.data ? JSON.stringify(response.data).length : undefined
        });
      }
      
      return response;
    } catch (error) {
      logger.error('Error in monitoring link:', error);
      return response;
    }
  });
});

export function makeClient() {
  return new ApolloClient({
    link: from([monitoringLink, errorLink, httpLink]),
    cache: new InMemoryCache({
      possibleTypes: {
        Node: ['MediaItem', 'Post', 'Category'],
        NodeWithFeaturedImage: ['Post']
      },
      typePolicies: {
        Query: {
          fields: {
            posts: {
              merge(_existing, incoming) {
                return incoming;
              }
            }
          }
        },
        MediaItem: {
          keyFields: false,
          fields: {
            sourceUrl: {
              merge: true
            },
            altText: {
              merge: true
            }
          }
        },
        Post: {
          keyFields: ['id'],
          fields: {
            featuredImage: {
              merge(_existing, incoming) {
                return incoming;
              }
            }
          }
        }
      }
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'ignore'
      },
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'ignore'
      }
    }
  });
}

export const getClient = () => makeClient(); 