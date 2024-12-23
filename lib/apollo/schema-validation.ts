import { buildClientSchema, validateSchema } from 'graphql';
import { logger } from '@/lib/logger';
import { Buffer } from 'buffer';

interface ValidationOptions {
  throwOnError?: boolean;
}

export async function validateGraphQLSchema(options: ValidationOptions = {}) {
  try {
    const graphqlUrl = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'https://hamptoncurrent.com/graphql';

    const authString = Buffer.from(
      `${process.env.WP_APPLICATION_USERNAME}:${process.env.WP_APPLICATION_PASSWORD}`
    ).toString('base64');

    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        query: introspectionQuery,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch schema: ${response.status} ${text}`);
    }

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