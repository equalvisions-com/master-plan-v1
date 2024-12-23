'use client';

import { ApolloProvider as BaseApolloProvider } from '@apollo/client';
import { makeClient } from '@/lib/apollo/apollo-client';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <BaseApolloProvider client={makeClient()}>
        {children}
      </BaseApolloProvider>
    </ErrorBoundary>
  );
} 