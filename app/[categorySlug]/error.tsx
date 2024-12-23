'use client';

import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function CategoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-16">
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Category</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message || 'There was an error loading this category.'}
        </AlertDescription>
        <div className="flex gap-4 mt-4">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </Alert>
    </div>
  );
} 