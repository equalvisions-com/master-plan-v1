import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { logger } from '@/lib/logger';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'https://hamptoncurrent.com/graphql',
  fetchOptions: { cache: 'no-store' },
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

export function makeClient() {
  return new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            posts: {
              keyArgs: ['where', ['categoryName', 'categoryId']],
              merge(existing = { nodes: [] }, incoming) {
                return {
                  ...incoming,
                  nodes: [...(existing?.nodes || []), ...(incoming?.nodes || [])],
                };
              },
            },
          },
        },
      },
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'network-only',
      },
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
    },
  });
}

export const getClient = () => makeClient(); 