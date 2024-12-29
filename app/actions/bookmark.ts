'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { BookmarkSchema } from '@/app/types/bookmark'
import type { BookmarkState } from '@/app/types/bookmark'

export async function toggleBookmarkAction(
  postId: string,
  title: string,
  userId: string,
  sitemapUrl: string,
  isBookmarked: boolean
): Promise<BookmarkState> {
  const supabase = await createClient()

  try {
    // Validate input - will throw if invalid
    BookmarkSchema.parse({
      postId,
      title,
      userId,
      sitemapUrl,
      isBookmarked
    })

    if (isBookmarked) {
      // Remove bookmark
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .match({ 
          user_id: userId,
          post_id: postId 
        })

      if (error) throw error
    } else {
      // Add bookmark
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: userId,
          post_id: postId,
          title: title,
          sitemap_url: sitemapUrl
        })
        .single()

      if (error) throw error
    }

    // Revalidate relevant paths
    revalidatePath('/bookmarks')
    revalidatePath('/profile')
    revalidatePath(sitemapUrl)

    return {
      success: true,
      message: isBookmarked ? 'Bookmark removed' : 'Post bookmarked'
    }
  } catch (error) {
    console.error('Bookmark action failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update bookmark'
    }
  }
}

export async function getBookmarkStatus(postId: string, userId: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .match({ 
        user_id: userId,
        post_id: postId 
      })
      .maybeSingle()

    if (error) throw error

    return { isBookmarked: !!data }
  } catch (error) {
    console.error('Failed to get bookmark status:', error)
    return { isBookmarked: false }
  }
} 