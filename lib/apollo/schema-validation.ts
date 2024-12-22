import { buildClientSchema, introspectionFromSchema, validateSchema } from 'graphql';
import { logger } from '@/lib/logger';

interface ValidationOptions {
  throwOnError?: boolean;
}

export async function validateGraphQLSchema(options: ValidationOptions = {}) {
  try {
    // Fetch the schema from WordPress
    const response = await fetch(process.env.NEXT_PUBLIC_WORDPRESS_API_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: introspectionQuery,
      }),
    });

    const { data } = await response.json();
    const schema = buildClientSchema(data);
    const validationErrors = validateSchema(schema);

    if (validationErrors.length > 0) {
      logger.error('Schema validation errors:', validationErrors);
      if (options.throwOnError) {
        throw new Error('Schema validation failed');
      }
    }

    return validationErrors.length === 0;
  } catch (error) {
    logger.error('Schema validation error:', error);
    if (options.throwOnError) {
      throw error;
    }
    return false;
  }
}

const introspectionQuery = `
  query IntrospectionQuery {
    __schema {
      types {
        name
        fields {
          name
          type {
            name
            kind
          }
        }
      }
    }
  }
`; 