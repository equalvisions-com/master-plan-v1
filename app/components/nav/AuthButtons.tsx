'use client'

import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export function AuthButtons({ user }: { user: User | null }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(user)
  const supabase = createClient()

  // Add effect to sync with auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Add debug logging
  useEffect(() => {
    console.log('AuthButtons user prop:', user)
    console.log('AuthButtons current user:', currentUser)
  }, [user, currentUser])

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

  // Use currentUser instead of user prop for rendering
  return currentUser ? (
    <div className="flex gap-4">
      <Button variant="ghost" asChild>
        <Link href="/profile">Profile</Link>
      </Button>
      <Button 
        variant="outline"
        onClick={handleSignOut}
        disabled={isLoading}
      >
        {isLoading ? 'Signing out...' : 'Sign out'}
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