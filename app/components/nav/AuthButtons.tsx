'use client'

import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AuthButtons({ user }: { user: User | null }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-4">
        <Button disabled>
          <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-current" />
        </Button>
      </div>
    )
  }

  return user ? (
    <div className="flex gap-4">
      <Button variant="ghost" asChild>
        <Link href="/profile">Profile</Link>
      </Button>
      <Button 
        variant="outline"
        onClick={handleSignOut}
      >
        Sign out
      </Button>
    </div>
  ) : (
    <div className="flex gap-4">
      <Button variant="ghost" asChild>
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild>
        <Link href="/signup">Sign up</Link>
      </Button>
    </div>
  )
} 