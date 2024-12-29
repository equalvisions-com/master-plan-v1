'use client'

import { ErrorBoundary } from 'react-error-boundary'
import { getBookmarkStatus } from '@/app/actions/bookmark'
import { BookmarkErrorBoundary } from './BookmarkErrorBoundary'

interface ErrorBoundaryWrapperProps {
  postId: string
  userId: string
  children: React.ReactNode
}

export function ErrorBoundaryWrapper({ 
  postId, 
  userId,
  children 
}: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      FallbackComponent={BookmarkErrorBoundary}
      onReset={async () => {
        // Attempt to reset the state when the user clicks "Try again"
        await getBookmarkStatus(postId, userId)
      }}
    >
      {children}
    </ErrorBoundary>
  )
} 