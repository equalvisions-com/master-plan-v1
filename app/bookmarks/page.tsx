import { getUserBookmarks } from '@/app/actions/bookmark'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const bookmarks = await getUserBookmarks(user.id)

  return (
    <div>
      {/* Render your bookmarks here */}
      {bookmarks.map((bookmark) => (
        <div key={bookmark.id}>
          <h2>{bookmark.title}</h2>
          {/* Add more bookmark details */}
        </div>
      ))}
    </div>
  )
} 