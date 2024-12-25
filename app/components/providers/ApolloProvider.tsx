'use client';

import { 
  ApolloClient, 
  ApolloProvider as BaseApolloProvider, 
  InMemoryCache,
  HttpLink,
  from
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { typePolicies } from '@/lib/apollo/apollo-config';
import { logger } from '@/lib/logger';

if (!process.env.NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL) {
  throw new Error('NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL is not defined');
}

// Create Apollo Client for client-side
const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL,
  headers: {
    'Content-Type': 'application/json',
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

const client = new ApolloClient({
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
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    }
  },
});

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseApolloProvider client={client}>
      {children}
    </BaseApolloProvider>
  );
} 