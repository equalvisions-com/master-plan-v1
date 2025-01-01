import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'
import { SubscriptionToggle } from '@/app/components/subscription/SubscriptionToggle'
import { prisma } from '@/lib/prisma'
import { Button } from '@/app/components/ui/button'
import Link from 'next/link'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching for this route

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  try {
    const userData = await prisma.user.findUnique({
      where: {
        id: user.id
      },
      select: {
        subscribed: true,
        _count: {
          select: {
            bookmarks: true
          }
        }
      }
    })

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

            <div className="mt-6 pt-6 border-t">
              <h2 className="text-xl font-semibold tracking-tight mb-4">
                Your Bookmarks
              </h2>
              <p className="text-muted-foreground mb-4">
                You have {userData._count.bookmarks} bookmarked {userData._count.bookmarks === 1 ? 'post' : 'posts'}
              </p>
              <Button asChild>
                <Link href="/bookmarks">View All Bookmarks</Link>
              </Button>
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