import { 
  ApolloClient, 
  HttpLink, 
  InMemoryCache,
  from
} from "@apollo/client";
import { onError } from '@apollo/client/link/error';
import { logger } from '@/lib/logger';
import { config } from '@/config';

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      if (message && locations && path) {
        logger.error('GraphQL Error:', {
          message,
          locations,
          path,
          operation: operation.operationName
        });
      } else {
        logger.error('Malformed GraphQL Error:', {
          error: graphQLErrors,
          operation: operation.operationName
        });
      }
    });
  }
  if (networkError) {
    logger.error('Network Error:', networkError);
  }
});

export function getServerClient() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerClient should only be called on the server');
  }

  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.WP_USER}:${process.env.WP_APP_PASS}`
      ).toString('base64')}`
    }
  });

  const cacheTTL = config.cache?.ttl || 3600;

  return new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache({ 
      typePolicies: {
        Query: {
          fields: {
            posts: {
              merge(existing = { nodes: [] }, incoming) {
                if (!incoming) return existing;
                return {
                  ...incoming,
                  nodes: [...(existing.nodes || []), ...(incoming.nodes || [])]
                };
              }
            }
          }
        },
        Post: {
          fields: {
            author: {
              merge(existing, incoming) {
                if (!incoming) return existing;
                return incoming;
              }
            }
          }
        }
      }
    }),
    defaultOptions: {
      query: {
        errorPolicy: 'all',
        fetchPolicy: 'no-cache',
        context: {
          fetchOptions: {
            next: { 
              revalidate: cacheTTL,
              tags: ['content']
            }
          }
        }
      }
    }
  });
} 