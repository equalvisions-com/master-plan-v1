'use client'

import { BookmarkError } from '@/app/types/bookmark'

export function BookmarkErrorBoundary({ error }: { error: Error | BookmarkError }) {
  return (
    <div role="alert" className="text-red-500">
      Failed to load bookmark: {error.message}
    </div>
  )
} 