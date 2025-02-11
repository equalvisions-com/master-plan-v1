import { AnalyticsProps } from '@/app/types/analytics';

class Logger {
  private formatError(error: unknown): string {
    if (!error) return 'No error details';
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  error(message: string, error?: unknown, request?: Request) {
    const formattedError = this.formatError(error);
    console.error(message, formattedError);
    
    const analyticsData: AnalyticsProps = {
      message,
      error: formattedError,
      url: request?.url,
      method: request?.method,
      timestamp: new Date().toISOString()
    };

    // Add analytics tracking here if needed
    return analyticsData;
  }

  info(message: string, data?: unknown) {
    console.log(message, data || '');
  }

  warn(message: string, data?: unknown) {
    console.warn(message, data || '');
  }

  debug(message: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, data || '');
    }
  }
}

export const logger = new Logger(); 