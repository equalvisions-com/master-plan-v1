import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'
import { SubscriptionToggle } from '@/app/components/subscription/SubscriptionToggle'
import { prisma } from '@/lib/prisma'

// Just keep dynamic rendering
export const dynamic = 'force-dynamic'

function BookmarkCount({ userId }: { userId: string }) {
  // This component will be streaming in after the static parts load
  const getBookmarkCount = async () => {
    'use server'
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: { bookmarks: true }
        }
      }
    })
    return userData?._count.bookmarks ?? 0
  }

  return (
    <Suspense fallback={<div>Loading bookmark count...</div>}>
      <AsyncBookmarkCount promise={getBookmarkCount()} />
    </Suspense>
  )
}

// Properly type the async component
async function AsyncBookmarkCount({ 
  promise 
}: { 
  promise: Promise<number>
}) {
  const count = await promise
  return (
    <p className="text-muted-foreground">
      You have {count} bookmarked {count === 1 ? 'post' : 'posts'}
    </p>
  )
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const userData = await prisma.user.findUnique({
    where: {
      id: user.id
    },
    select: {
      subscribed: true
    }
  })

  if (!userData) {
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
            <BookmarkCount userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  )
} 