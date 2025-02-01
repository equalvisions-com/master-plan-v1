import { 
  ApolloClient, 
  HttpLink, 
  InMemoryCache,
  from,
  type TypePolicies
} from "@apollo/client";
import { onError } from '@apollo/client/link/error';
import { logger } from '@/lib/logger';
import { config } from '@/config';

// Merge existing typePolicies with ISR optimizations
export const typePolicies: TypePolicies = {
  Query: {
    fields: {
      posts: {
        keyArgs: ['where', ['categoryName', 'categoryId']],
        merge(existing = { nodes: [] }, incoming, { args }) {
          // Don't merge if cursor changed (new page)
          if (args?.after !== existing?.pageInfo?.endCursor) {
            return incoming;
          }
          return {
            ...incoming,
            nodes: [...(existing.nodes || []), ...(incoming.nodes || [])]
          };
        }
      },
      // Add category caching policy
      category: {
        keyArgs: ['slug'],
        merge(existing, incoming, { args }) {
          if (!existing) return incoming;
          
          // Handle posts field separately
          if (incoming.posts && existing.posts) {
            if (args?.after !== existing.posts.pageInfo?.endCursor) {
              return incoming;
            }
            return {
              ...incoming,
              posts: {
                ...incoming.posts,
                nodes: [...existing.posts.nodes, ...incoming.posts.nodes]
              }
            };
          }
          return incoming;
        }
      }
    }
  },
  Post: {
    keyFields: ['id'],
    fields: {
      content: {
        merge: true
      },
      modified: {
        merge: true
      }
    }
  }
};

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

  const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        logger.error('GraphQL Error:', {
          message,
          locations,
          path,
          operation: operation.operationName
        });
      });
    }
    if (networkError) {
      logger.error('Network Error:', networkError);
    }
  });

  const cacheTTL = config.cache?.ttl || 3600;

  return new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache({ 
      typePolicies,
      possibleTypes: {
        Node: ['Post', 'Page', 'MediaItem', 'Category'],
        ContentNode: ['Post', 'Page', 'MediaItem'],
        DatabaseIdentifier: ['Post', 'Page', 'MediaItem', 'Category'],
        MenuItemLinkable: ['Post', 'Page', 'Category']
      }
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache', // Important for SSR/ISR
        errorPolicy: 'all',
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