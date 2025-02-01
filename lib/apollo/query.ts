import { DocumentNode } from '@apollo/client';
import { getServerClient } from './apollo-config';
import { config } from '@/config';
import { cacheMonitor } from '@/lib/cache/monitoring';
import { unstable_noStore } from 'next/cache';

interface QueryOptions {
  tags?: string[];
  revalidate?: number;
  monitor?: boolean;
  static?: boolean;
}

// Define allowed variable types for GraphQL queries
type GraphQLVariableValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | { [key: string]: GraphQLVariableValue }
  | Array<GraphQLVariableValue>;

type GraphQLVariables = Record<string, GraphQLVariableValue>;

export async function serverQuery<T>({
  query,
  variables = {},
  options = {}
}: {
  query: DocumentNode;
  variables?: GraphQLVariables;
  options?: QueryOptions;
}) {
  if (!options.static) {
    unstable_noStore();
  }
  const startTime = performance.now();
  const queryName = (query.definitions[0]?.kind === 'OperationDefinition' 
    ? query.definitions[0].name?.value 
    : 'unknown') || 'unnamed-query';

  try {
    const client = getServerClient();
    const defaultTTL = 3600;
    const cacheTTL = config?.cache?.ttl ?? defaultTTL;

    const result = await client.query<T>({
      query,
      variables,
      context: {
        fetchOptions: {
          next: {
            revalidate: options.revalidate ?? cacheTTL,
            tags: [...(options.tags || []), 'content']
          }
        }
      }
    });

    if (options.monitor) {
      cacheMonitor.logCacheHit({
        key: queryName,
        source: 'isr',
        duration: performance.now() - startTime,
        size: JSON.stringify(result.data).length
      });
    }

    return result;
  } catch (error) {
    if (options.monitor) {
      cacheMonitor.logCacheMiss({
        key: queryName,
        source: 'isr',
        duration: performance.now() - startTime
      });
    }
    throw error;
  }
} 