'use client'

import { ErrorBoundary } from 'react-error-boundary'
import { BookmarkErrorBoundary } from './BookmarkErrorBoundary'

interface ErrorBoundaryWrapperProps {
  postId: string
  userId: string
  children: React.ReactNode
  onReset: () => Promise<void>
}

export function ErrorBoundaryWrapper({ 
  postId, 
  userId,
  children,
  onReset
}: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      FallbackComponent={BookmarkErrorBoundary}
      onReset={onReset}
      resetKeys={[postId, userId]}
    >
      {children}
    </ErrorBoundary>
  )
} 