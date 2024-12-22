'use client'

import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function ProfileForm({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Email</h2>
          <p className="text-lg">{user.email}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">User ID</h2>
          <p className="text-lg font-mono">{user.id}</p>
        </div>
        {user.app_metadata?.provider && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Sign in method</h2>
            <p className="text-lg capitalize">{user.app_metadata.provider}</p>
          </div>
        )}
      </div>
      <Button variant="ghost" asChild className="mt-8">
        <Link href="/">← Back to Home</Link>
      </Button>
    </div>
  )
} 