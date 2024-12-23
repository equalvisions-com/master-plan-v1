import { buildClientSchema, validateSchema, getIntrospectionQuery } from 'graphql';
import { logger } from '@/lib/logger';
import { Buffer } from 'buffer';

interface ValidationOptions {
  throwOnError?: boolean;
}

export async function validateGraphQLSchema(options: ValidationOptions = {}) {
  try {
    const graphqlUrl = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'https://hamptoncurrent.com/graphql';

    const authString = Buffer.from(
      `${process.env.WP_USER}:${process.env.WP_APP_PASS}`
    ).toString('base64');

    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        query: getIntrospectionQuery(),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`Failed to fetch schema: ${response.status} ${text}`);
      if (response.status === 403) {
        logger.error('Authorization failed. Please check your credentials.');
      }
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