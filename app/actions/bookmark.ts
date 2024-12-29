'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { revalidateTag, revalidatePath } from 'next/cache'

// Cache the bookmark status check with tags
export const getBookmarkStatus = cache(async (postId: string, userId: string) => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error('Failed to check bookmark status')
  }

  return {
    isBookmarked: !!data
  }
})

// Server action to toggle bookmark
export async function toggleBookmark(formData: FormData) {
  const postId = formData.get('postId') as string
  const userId = formData.get('userId') as string
  const title = formData.get('title') as string
  const sitemapUrl = formData.get('sitemapUrl') as string | null

  const supabase = await createClient()
  const { isBookmarked } = await getBookmarkStatus(postId, userId)

  if (isBookmarked) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)

    if (error) throw new Error('Failed to remove bookmark')
  } else {
    const { error } = await supabase
      .from('bookmarks')
      .insert({
        post_id: postId,
        user_id: userId,
        title,
        sitemap_url: sitemapUrl
      })

    if (error) throw new Error('Failed to add bookmark')
  }

  // Granular revalidation using tags
  revalidateTag(`bookmark-${postId}`)
  revalidateTag(`user-${userId}-bookmarks`)
  revalidateTag('bookmark-status')

  // Only revalidate the specific post path if we have a sitemap URL
  if (sitemapUrl) {
    revalidatePath(sitemapUrl)
  }
  
  return { isBookmarked: !isBookmarked }
}

// Get user's bookmarks with caching
export const getUserBookmarks = cache(async (userId: string) => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to fetch bookmarks')
  }

  return data
}) 