import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'
import { SubscriptionToggle } from '@/app/components/subscription/SubscriptionToggle'
import { ErrorBoundary } from 'react-error-boundary'

// Add a fallback error component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border bg-card p-8">
          <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
          <p className="mt-2 text-gray-600">{error.message}</p>
        </div>
      </div>
    </div>
  )
}

async function ProfileContent() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Auth error:', authError)
      redirect('/login')
    }
    
    if (!user) {
      console.log('No user found')
      redirect('/login')
    }

    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('subscribed')
      .eq('id', user.id)
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to load subscription status')
    }

    if (!userData) {
      console.error('No user data found for ID:', user.id)
      throw new Error('User data not found')
    }

    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border bg-card p-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-6">
              Profile
            </h1>
            <ProfileForm user={user} />
            
            <div className="mt-6 pt-6 border-t">
              <h2 className="text-xl font-semibold tracking-tight mb-4">
                Newsletter Subscription
              </h2>
              <SubscriptionToggle 
                userId={user.id}
                initialStatus={!!userData.subscribed}
              />
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Profile content error:', error)
    throw error
  }
}

export default function ProfilePage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ProfileContent />
    </ErrorBoundary>
  )
} 