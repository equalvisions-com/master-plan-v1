declare module '@apollo/client' {
  export * from '@apollo/client/core';
  export * from '@apollo/client/react';
  export * from '@apollo/client/link/core';
}

declare module '@apollo/client/link/retry' {
  import { ApolloLink } from '@apollo/client/core';
  
  export class RetryLink extends ApolloLink {
    constructor(options?: {
      attempts?: {
        max?: number;
        retryIf?: (error: any, operation: any) => boolean;
      };
      delay?: {
        initial?: number;
        max?: number;
        jitter?: boolean;
      };
    });
  }
} 