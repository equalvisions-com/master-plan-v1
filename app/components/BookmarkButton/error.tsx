'use client'

import type { BookmarkError as BookmarkErrorType } from '@/app/types/bookmark'

interface BookmarkErrorProps {
  error: BookmarkErrorType
  resetErrorBoundary: () => void
}

export function BookmarkError({ error, resetErrorBoundary }: BookmarkErrorProps) {
  return (
    <div role="alert" className="inline-flex flex-col gap-2">
      <div className="text-sm text-red-600">
        {error.message || 'Something went wrong'}
      </div>
      <button 
        onClick={resetErrorBoundary}
        className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
          bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
      >
        Try again
      </button>
    </div>
  )
} 