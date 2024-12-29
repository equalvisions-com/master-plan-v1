import { BookmarkForm } from '@/app/components/BookmarkButton/BookmarkForm'
import { Dialog } from '@/app/components/ui/dialog'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getBookmarkStatus } from '@/app/actions/bookmark'
import { prisma } from '@/lib/prisma'

export default async function BookmarkModal({
  params
}: {
  params: { postId: string }
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get bookmark status and post title
  const [bookmarkStatus, bookmark] = await Promise.all([
    getBookmarkStatus(params.postId, user.id),
    prisma.bookmark.findUnique({
      where: {
        user_id_post_id: {
          user_id: user.id,
          post_id: params.postId
        }
      },
      select: {
        title: true,
        sitemapUrl: true
      }
    })
  ])

  return (
    <Dialog>
      <div className="fixed inset-0 bg-black/30 z-50">
        <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Bookmark Post</h2>
          <BookmarkForm
            postId={params.postId}
            userId={user.id}
            initialIsBookmarked={bookmarkStatus.isBookmarked}
            title={bookmark?.title ?? ''}
            sitemapUrl={bookmark?.sitemapUrl ?? null}
            modal={true}
          />
        </div>
      </div>
    </Dialog>
  )
} 