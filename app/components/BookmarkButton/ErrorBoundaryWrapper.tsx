'use client'

import { ErrorBoundary } from 'react-error-boundary'
import { BookmarkError } from './error'
import { getBookmarkStatus } from '@/app/actions/bookmark'

interface ErrorBoundaryWrapperProps {
  postId: string
  children: React.ReactNode
}

export function ErrorBoundaryWrapper({ postId, children }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      FallbackComponent={BookmarkError}
      onReset={async () => {
        // Attempt to reset the state when the user clicks "Try again"
        await getBookmarkStatus(postId)
      }}
    >
      {children}
    </ErrorBoundary>
  )
} 