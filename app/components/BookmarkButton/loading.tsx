'use client'

import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'

export function BookmarkLoading() {
  return (
    <div 
      className="flex items-center space-x-4" 
      role="status"
      aria-label="Loading bookmark status"
    >
      <div className="h-10 w-24 bg-gray-200 rounded-md flex items-center justify-center">
        <LoadingSpinner className="h-5 w-5 text-gray-400" />
      </div>
      <span className="sr-only">Loading bookmark status...</span>
    </div>
  )
} 