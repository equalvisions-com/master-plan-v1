'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true,
      error 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error Boundary caught error:', { 
      error, 
      errorInfo,
      componentStack: errorInfo.componentStack 
    });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="text-sm text-muted-foreground mt-2 p-4 bg-muted rounded-md overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
        </div>
      );
    }

    return this.props.children;
  }
} 