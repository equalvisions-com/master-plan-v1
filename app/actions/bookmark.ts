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
  
  try {
    const { data: existingBookmark } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single()

    if (existingBookmark) {
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)

      if (deleteError) throw new Error('Failed to remove bookmark')
    } else {
      const { error: insertError } = await supabase
        .from('bookmarks')
        .insert({
          post_id: postId,
          user_id: userId,
          title,
          sitemap_url: sitemapUrl
        })

      if (insertError) throw new Error('Failed to add bookmark')
    }

    // Invalidate relevant caches
    revalidateTag('bookmark-status')
    revalidateTag(`bookmark-${postId}`)
    revalidateTag(`user-${userId}-bookmarks`)

    // Revalidate paths if needed
    if (sitemapUrl) {
      revalidatePath(sitemapUrl)
    }
    revalidatePath('/bookmarks')
    
    return { isBookmarked: !existingBookmark }
  } catch (err) {
    throw new Error('Failed to toggle bookmark')
  }
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