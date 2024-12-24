'use client';

import { ApolloClient, ApolloProvider as BaseApolloProvider, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          posts: {
            keyArgs: false,
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
});

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseApolloProvider client={client}>
      {children}
    </BaseApolloProvider>
  );
} 