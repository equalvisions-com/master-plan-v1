import { getClient } from './apollo-client';
import { gql } from '@apollo/client';
import { logger } from '@/lib/logger';

const INTROSPECTION_QUERY = gql`
  query IntrospectionQuery {
    __schema {
      types {
        name
        fields {
          name
          type {
            name
          }
        }
      }
    }
  }
`;

interface ValidationOptions {
  throwOnError?: boolean;
}

export async function validateGraphQLSchema({ throwOnError = false }: ValidationOptions = {}) {
  try {
    const client = await getClient();
    const result = await client.query({
      query: INTROSPECTION_QUERY,
    });

    if (!result.data?.__schema) {
      const error = new Error('Invalid GraphQL schema');
      logger.error('Schema validation failed:', error);
      if (throwOnError) throw error;
      return false;
    }

    logger.info('GraphQL schema validated successfully');
    return true;
  } catch (error) {
    logger.error('Schema validation error:', error);
    if (throwOnError) throw error;
    return false;
  }
} 