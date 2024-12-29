'use client'

import { ErrorBoundary } from 'react-error-boundary'
import { BookmarkErrorBoundary } from './BookmarkErrorBoundary'
import { checkBookmarkStatus } from '@/app/actions/bookmark-status'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'

interface BookmarkErrorWrapperProps {
  postId: string
  userId: string
  children: React.ReactNode
}

export function BookmarkErrorWrapper({ 
  postId, 
  userId,
  children 
}: BookmarkErrorWrapperProps) {
  const handleReset = async () => {
    try {
      const result = await checkBookmarkStatus(postId, userId)
      if (!result.success) {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Error resetting bookmark status:', err)
    }
  }

  return (
    <ErrorBoundary
      FallbackComponent={BookmarkErrorBoundary}
      onReset={handleReset}
    >
      <Card className="p-0">
        {children}
      </Card>
    </ErrorBoundary>
  )
} 