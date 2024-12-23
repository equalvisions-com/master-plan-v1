import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

export function getServerClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'https://hamptoncurrent.com/graphql',
    }),
    defaultOptions: {
      query: {
        fetchPolicy: "cache-first",
        errorPolicy: "all",
      },
    },
  });
} 