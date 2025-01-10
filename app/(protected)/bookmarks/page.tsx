import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BookmarksList } from './BookmarksList'
import { AppDock } from '@/app/components/AppDock'
import { MainLayout } from "@/app/components/layouts/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <div className="container-fluid pb-16 md:pb-0">
        <MainLayout>
          <ScrollArea 
            className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
            type="always"
          >
            <div className="max-w-4xl">
              <h1 className="text-2xl font-semibold tracking-tight mb-6">
                Your Bookmarks
              </h1>
              <BookmarksList bookmarks={bookmarks} />
            </div>
          </ScrollArea>
        </MainLayout>

        <div className="fixed bottom-0 left-0 right-0 md:hidden">
          <AppDock user={user} />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Bookmarks page error:', error)
    throw error
  }
} 