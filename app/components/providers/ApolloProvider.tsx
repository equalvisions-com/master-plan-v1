'use client';

import { ApolloProvider as BaseApolloProvider } from '@apollo/client';
import { getClient } from '@/lib/apollo/apollo-client';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <BaseApolloProvider client={getClient()}>
        {children}
      </BaseApolloProvider>
    </ErrorBoundary>
  );
} 