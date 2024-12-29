import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'
import { SubscriptionToggle } from '@/app/components/subscription/SubscriptionToggle'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching for this route

interface ProfilePageProps {
  searchParams?: { [key: string]: string | string[] | undefined }
}

interface UserData {
  subscribed: boolean;
  bookmarks: {
    count: number;
  }[];
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  try {
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select(`
        subscribed,
        bookmarks:bookmarks_count
      `)
      .eq('id', user.id)
      .single() as { data: UserData | null, error: any }

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to load user data')
    }

    if (!userData) {
      console.error('No user data found for ID:', user.id)
      throw new Error('User data not found')
    }

    // Get the total count from the array
    const bookmarkCount = userData.bookmarks?.[0]?.count || 0

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

            <div className="mt-6 pt-6 border-t">
              <h2 className="text-xl font-semibold tracking-tight mb-4">
                Your Bookmarks
              </h2>
              <p className="text-muted-foreground">
                You have {bookmarkCount} bookmarked {bookmarkCount === 1 ? 'post' : 'posts'}
              </p>
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