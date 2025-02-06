import { Suspense } from 'react'
import { Comments } from './Client'
import { User } from '@supabase/supabase-js'
import { unstable_noStore } from 'next/cache'

interface CommentsServerProps {
  url: string
  user: User | null
}

export async function CommentsServer({ url, user }: CommentsServerProps) {
  unstable_noStore()

  return (
    <Suspense fallback={<div className="animate-pulse h-32 bg-muted rounded-md" />}>
      <Comments 
        url={url}
        user={user}
      />
    </Suspense>
  )
} 