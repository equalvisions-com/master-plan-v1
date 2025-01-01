import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BookmarksList } from './BookmarksList'
import { MainNav } from '@/app/components/nav'
import { AppDock } from '@/app/components/AppDock'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        user_id: user.id
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return (
      <div className="min-h-screen pb-16 md:pb-0">
        <header className="border-b">
          <div className="container mx-auto px-4">
            <MainNav user={user} />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold tracking-tight mb-6">
              Your Bookmarks
            </h1>
            <BookmarksList bookmarks={bookmarks} />
          </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 md:hidden">
          <AppDock />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Bookmarks page error:', error)
    throw error
  }
} 