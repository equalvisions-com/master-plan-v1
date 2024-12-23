'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to our logging service
    logger.error('Client-side error:', error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16">
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertTitle>Something went wrong!</AlertTitle>
        <AlertDescription className="mt-2">
          {process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'An error occurred while loading this page.'}
        </AlertDescription>
        <div className="mt-4">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        </div>
      </Alert>
    </div>
  );
} 