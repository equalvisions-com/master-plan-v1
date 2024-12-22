'use client'

import { useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthCard } from '@/components/auth/auth-card'
import { Separator } from '@/components/ui/separator'
import { CheckEmailCard } from '@/components/auth/CheckEmailCard'

export default function LoginPage() {
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null)

  const handleTryAgain = () => {
    setEmailSentTo(null)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard 
        title={emailSentTo ? undefined : "Welcome back"}
        description={emailSentTo ? undefined : "Sign in to your account"}
      >
        {emailSentTo ? (
          <CheckEmailCard 
            email={emailSentTo} 
            onTryAgain={handleTryAgain}
          />
        ) : (
          <>
            <div className="grid gap-5">
              <LoginForm onEmailSent={setEmailSentTo} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <GoogleButton />
            </div>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <a href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </a>
            </p>
          </>
        )}
      </AuthCard>
    </div>
  )
} 