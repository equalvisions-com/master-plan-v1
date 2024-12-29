'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag, revalidatePath, unstable_cache } from 'next/cache'
import { BookmarkSchema } from '@/app/types/bookmark'
import type { BookmarkState } from '@/app/types/bookmark'
import { headers } from 'next/headers'

// Add cache for bookmark status
export const getBookmarkStatus = unstable_cache(
  async (postId: string, userId: string) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .match({ 
        user_id: userId,
        post_id: postId 
      })
      .single()

    return { isBookmarked: !!data }
  },
  ['bookmark-status'],
  {
    tags: [`bookmark-status`],
    revalidate: 60 // Cache for 1 minute
  }
)

export async function toggleBookmarkAction(
  postId: string,
  title: string,
  userId: string,
  sitemapUrl: string | null,
  isBookmarked: boolean
): Promise<BookmarkState> {
  const start = performance.now()

  // Validate input data
  const validatedData = BookmarkSchema.safeParse({
    postId,
    title,
    userId,
    sitemapUrl,
    isBookmarked
  })

  if (!validatedData.success) {
    console.error('Validation error:', validatedData.error)
    return {
      success: false,
      error: 'Invalid bookmark data'
    }
  }

  const supabase = await createClient()

  try {
    // First check if bookmark exists
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('*')
      .match({ 
        user_id: userId,
        post_id: postId 
      })
      .single()

    if (isBookmarked) {
      // Only try to delete if it exists
      if (existing) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .match({ 
            user_id: userId,
            post_id: postId 
          })

        if (error) throw error
      }
    } else {
      // Only try to insert if it doesn't exist
      if (!existing) {
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: userId,
            post_id: postId,
            title: title,
            sitemapUrl
          })

        if (error) throw error
      }
    }

    // More granular cache invalidation
    revalidateTag(`user-${userId}-bookmarks`)
    revalidateTag(`post-${postId}-bookmarks`)
    revalidateTag('bookmark-status')
    
    if (sitemapUrl) {
      revalidatePath(sitemapUrl)
    }

    // Add timing header for monitoring
    headers().set('Server-Timing', `bookmark;dur=${performance.now() - start}`)

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