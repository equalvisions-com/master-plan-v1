import { AuthCard } from '@/app/components/auth/auth-card'
import { LoginForm } from '@/app/components/auth/LoginForm'
import { GoogleButton } from '@/app/components/auth/GoogleButton'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4">
      <AuthCard
        title="Welcome back"
        description="Sign in to your account"
      >
        <LoginForm />
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <GoogleButton />
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium underline underline-offset-4 hover:text-primary">
            Sign up
          </Link>
        </div>
      </AuthCard>
    </div>
  )
} 