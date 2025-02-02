import { DocumentNode } from '@apollo/client';
import { getServerClient } from './apollo-config';
import { config } from '@/config';
import { unstable_noStore } from 'next/cache';

export interface QueryOptions {
  tags?: string[];
  context?: {
    fetchOptions?: {
      next?: {
        revalidate?: number;
        tags?: string[];
      };
      cache?: RequestCache;
    };
  };
  fetchPolicy?: 'cache-first' | 'network-only';
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
  unstable_noStore();
  
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
            revalidate: options.context?.fetchOptions?.next?.revalidate ?? cacheTTL,
            tags: [...(options.tags || []), 'content']
          }
        }
      }
    });

    return result;
  } catch (error) {
    throw error;
  }
} 