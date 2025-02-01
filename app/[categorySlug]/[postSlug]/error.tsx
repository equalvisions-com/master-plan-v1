'use client';

import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container py-8">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error.message || 'Something went wrong!'}
        </AlertDescription>
        <Button 
          onClick={() => reset()}
          variant="outline"
          className="mt-4"
        >
          Try again
        </Button>
      </Alert>
    </div>
  );
} 