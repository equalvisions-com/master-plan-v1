import { ApolloError } from '@apollo/client';
import { logger } from '@/lib/logger';

interface WordPressGraphQLError {
  extensions?: {
    category?: string;
  };
}

export function handleApolloError(error: ApolloError) {
  if (error.networkError) {
    // Handle network errors
    console.error('Network error:', error.networkError);
    return { message: 'Network error occurred', code: 'NETWORK_ERROR' };
  }

  if (error.graphQLErrors) {
    // Handle GraphQL errors
    console.error('GraphQL errors:', error.graphQLErrors);
    
    // Check for WordPress specific errors
    const hasWordPressError = error.graphQLErrors.some(
      (e: WordPressGraphQLError) => e.extensions?.category === 'wordpress'
    );
    
    if (hasWordPressError) {
      logger.error('WordPress specific error:', error);
      return { message: 'WordPress error occurred', code: 'WORDPRESS_ERROR' };
    }

    return {
      message: error.graphQLErrors[0]?.message || 'GraphQL error occurred',
      code: error.graphQLErrors[0]?.extensions?.code || 'GRAPHQL_ERROR'
    };
  }

  return { message: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' };
} 