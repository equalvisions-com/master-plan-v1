'use client'

import { useState } from 'react'
import { SignupForm } from '@/components/auth/SignupForm'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthCard } from '@/components/auth/auth-card'
import { Separator } from '@/components/ui/separator'
import { CheckEmailCard } from '@/components/auth/CheckEmailCard'

export default function SignupPage() {
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null)

  const handleTryAgain = () => {
    setEmailSentTo(null)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard 
        title={emailSentTo ? undefined : "Create an account"}
        description={emailSentTo ? undefined : "Enter your email below to create your account"}
      >
        {emailSentTo ? (
          <CheckEmailCard 
            email={emailSentTo} 
            isSignUp 
            onTryAgain={handleTryAgain}
          />
        ) : (
          <>
            <div className="grid gap-5">
              <SignupForm onEmailSent={setEmailSentTo} />
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
              Already have an account?{' '}
              <a href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </a>
            </p>
          </>
        )}
      </AuthCard>
    </div>
  )
} 