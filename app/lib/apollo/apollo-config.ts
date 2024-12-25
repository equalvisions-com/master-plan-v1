import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

export function getServerClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: process.env.WORDPRESS_API_URL,
      fetchOptions: {
        keepalive: true,
        timeout: 30000,
      },
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      },
    },
  });
} 