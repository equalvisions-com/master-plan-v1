'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"

export function GoogleButton() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient()
  const pathname = usePathname()

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      className="h-10 text-sm font-medium"
      onClick={handleGoogleSignIn} 
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-current" />
      ) : (
        <>
          <FcGoogle className="h-5 w-5" />
          <span>{pathname === '/signup' ? 'Sign up' : 'Sign in'} with Google</span>
        </>
      )}
    </Button>
  )
}