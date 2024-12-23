'use client';

import { ApolloClient, InMemoryCache, ApolloProvider as BaseApolloProvider } from "@apollo/client";

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
  credentials: 'same-origin',
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          posts: {
            keyArgs: ['first', 'after', 'where'],
            merge(existing = { nodes: [] }, incoming = { nodes: [] }, { args }) {
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
  })
});

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseApolloProvider client={client}>
      {children}
    </BaseApolloProvider>
  );
} 