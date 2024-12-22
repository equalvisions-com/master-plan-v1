import { ZodError } from 'zod';
import { logger } from '../logger';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof APIError) {
    logger.error('API Error:', error);
  } else if (error instanceof ZodError) {
    logger.error('Validation Error:', error.errors);
  }
  // Log error to monitoring service
}; 