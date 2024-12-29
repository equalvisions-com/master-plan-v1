'use client'

import { ErrorBoundary } from 'react-error-boundary'
import { BookmarkErrorBoundary } from './BookmarkErrorBoundary'
import { SupabaseClient } from '@supabase/supabase-js'

interface BookmarkErrorWrapperProps {
  postId: string
  userId: string
  supabase: SupabaseClient
  children: React.ReactNode
}

export function BookmarkErrorWrapper({ 
  postId, 
  userId,
  supabase,
  children 
}: BookmarkErrorWrapperProps) {
  const handleReset = async () => {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error('Failed to check bookmark status')
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
      {children}
    </ErrorBoundary>
  )
} 