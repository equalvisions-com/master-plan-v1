'use server'

import { createClient } from '@/lib/supabase/server'

export async function getBookmarkStatus(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { isBookmarked: false, userId: null }
  }

  const { data: bookmark } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .single()

  return { 
    isBookmarked: !!bookmark,
    userId: user.id
  }
}

export async function toggleBookmark(
  postId: string, 
  title: string, 
  userId: string, 
  isBookmarked: boolean,
  sitemapUrl: string
) {
  'use server'
  
  const supabase = await createClient()
  
  if (isBookmarked) {
    await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
  } else {
    await supabase
      .from('bookmarks')
      .insert([
        {
          user_id: userId,
          post_id: postId,
          title: title,
          sitemapUrl: sitemapUrl
        }
      ])
  }
} 