import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'
import { SubscriptionToggle } from '@/app/components/subscription/SubscriptionToggle'

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  const { data: userData, error: dbError } = await supabase
    .from('users')
    .select('subscribed')
    .eq('id', user.id)
    .single()

  if (dbError) {
    console.error('Failed to fetch user subscription status:', dbError)
    throw new Error('Failed to load profile data')
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
              initialStatus={!!userData?.subscribed}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 