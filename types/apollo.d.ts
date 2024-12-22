// Add type declarations
declare module '@apollo/client/link/batch-http' {
  export class BatchHttpLink extends ApolloLink {
    constructor(options: BatchHttpLinkOptions);
  }
} 