import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { typePolicies } from './apollo-config';

export function getServerClient() {
  const authString = Buffer.from(
    `${process.env.WP_APPLICATION_USERNAME}:${process.env.WP_APPLICATION_PASSWORD}`
  ).toString('base64');

  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'https://hamptoncurrent.com/graphql',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
    fetch: fetch, // Explicitly use fetch
  });

  return new ApolloClient({
    link: httpLink,
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
        fetchPolicy: 'no-cache', // Use no-cache for SSR
        errorPolicy: 'all',
      },
    },
  });
} 