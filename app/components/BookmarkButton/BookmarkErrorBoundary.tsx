'use client'

import type { BookmarkState } from '@/app/types/bookmark'

interface ErrorBoundaryProps {
  error: Error | Pick<BookmarkState, 'error'>
}

export function BookmarkErrorBoundary({ error }: ErrorBoundaryProps) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : error.error || 'An error occurred'

  return (
    <div 
      role="alert" 
      className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded"
    >
      Failed to load bookmark: {errorMessage}
    </div>
  )
} 