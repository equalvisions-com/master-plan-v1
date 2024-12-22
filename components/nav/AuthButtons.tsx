'use client'

import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AuthButtons({ user }: { user: User | null }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient()

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

  return user ? (
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