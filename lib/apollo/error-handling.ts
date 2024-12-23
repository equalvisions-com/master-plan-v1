import { onError } from '@apollo/client/link/error';
import { logger } from '@/lib/logger';

export const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      logger.error('GraphQL Error:', {
        message,
        locations,
        path,
        operation: operation.operationName,
      });
    });
  }

  if (networkError) {
    logger.error('Network Error:', networkError);
  }
}); 