import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

export function getServerClient() {
  const authString = Buffer.from(
    `${process.env.WP_APPLICATION_USERNAME}:${process.env.WP_APPLICATION_PASSWORD}`
  ).toString('base64');

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'https://hamptoncurrent.com/graphql',
      headers: {
        'Authorization': `Basic ${authString}`,
      },
    }),
    defaultOptions: {
      query: {
        fetchPolicy: "cache-first",
        errorPolicy: "all",
      },
    },
  });
} 