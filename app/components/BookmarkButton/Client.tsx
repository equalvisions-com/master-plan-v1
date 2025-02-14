'use client'

import { Button } from "@/app/components/ui/button"
import { User } from '@supabase/supabase-js'
import { ErrorBoundary } from 'react-error-boundary'
import { BookmarkErrorBoundary } from './BookmarkErrorBoundary'
import { BookmarkForm } from './BookmarkForm'

// Export the interface
export interface BookmarkButtonProps {
  postId: string
  title: string
  sitemapUrl: string | null
  user: User | null
  initialIsBookmarked: boolean
  featuredImage?: string | null
}

function SignInButton() {
  return (
    <form action="/login">
      <Button 
        type="submit"
        variant="default" 
        size="sm"
        className="rounded-full"
      >
        Follow
      </Button>
    </form>
  )
}

export function BookmarkButton({ 
  postId, 
  title, 
  sitemapUrl, 
  user,
  initialIsBookmarked,
  featuredImage
}: BookmarkButtonProps) {
  if (!user) {
    return <SignInButton />
  }

  return (
    <ErrorBoundary
      FallbackComponent={BookmarkErrorBoundary}
      onReset={async () => {
        // Reset state logic here if needed
      }}
    >
      <BookmarkForm 
        postId={postId}
        title={title}
        userId={user.id}
        sitemapUrl={sitemapUrl}
        initialIsBookmarked={initialIsBookmarked}
        featuredImage={featuredImage}
      />
    </ErrorBoundary>
  )
} 