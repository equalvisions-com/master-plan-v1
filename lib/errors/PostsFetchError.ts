export class PostsFetchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PostsFetchError';
  }
} 