'use client';

import { ApolloClient, InMemoryCache, ApolloProvider as BaseApolloProvider, from, HttpLink, ApolloError } from "@apollo/client";
import { config } from '@/config';
import { RetryLink } from "@apollo/client/link/retry";
import type { ReactNode } from 'react';

interface Node {
  id: string;
  [key: string]: any;
}

interface NodesResponse {
  nodes: Node[];
}

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
      if (!error || error.statusCode === 404) return false;
      if (error.response?.errors?.[0]?.extensions?.code === 'INVALID_SLUG') return false;
      return true;
    }
  },
  delay: {
    initial: 300,
    max: 2000,
    jitter: true
  }
});

const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          posts: {
            keyArgs: ['first', 'after', 'where'],
            merge(existing: NodesResponse = { nodes: [] }, 
                 incoming: NodesResponse = { nodes: [] }, 
                 { args }: { args: { after?: string } }) {
              if (args?.after) {
                return {
                  ...incoming,
                  nodes: [...existing.nodes, ...incoming.nodes]
                };
              }
              return incoming;
            }
          }
        }
      }
    }
  }),
  link: from([retryLink, httpLink]),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first'
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all'
    }
  }
});

export function ApolloProvider({ children }: { children: ReactNode }) {
  return (
    <BaseApolloProvider client={client}>
      {children}
    </BaseApolloProvider>
  );
} 