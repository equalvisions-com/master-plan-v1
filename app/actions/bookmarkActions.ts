'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag, revalidatePath, unstable_cache } from 'next/cache'
import { BookmarkSchema } from '@/app/types/bookmark'
import type { BookmarkState } from '@/app/types/bookmark'
import { headers } from 'next/headers'

const BOOKMARK_ERRORS = {
  INVALID_DATA: {
    code: 'INVALID_DATA',
    message: 'Invalid bookmark data provided'
  },
  OPERATION_FAILED: {
    code: 'OPERATION_FAILED',
    message: 'Failed to update bookmark'
  }
} as const

// Efficient caching with Next.js 15 patterns
export const getBookmarkStatus = unstable_cache(
  async (postId: string, userId: string) => {
    const supabase = await createClient()
    const { data } = await supabase
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
    tags: ['bookmark-status'],
    revalidate: 60 // Next.js 15 only supports revalidate and tags
  }
)

// Internal toggle function
async function toggleBookmark(
  postId: string,
  title: string,
  userId: string,
  sitemapUrl: string | null,
  isBookmarked: boolean
): Promise<BookmarkState> {
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

    // Cache invalidation
    revalidateTag('bookmark-status')
    revalidateTag(`user-${userId}-bookmarks`)
    revalidateTag(`post-${postId}-bookmarks`)
    
    if (sitemapUrl) {
      revalidatePath(sitemapUrl)
    }

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

// Single server action for bookmark operations
export async function bookmarkAction(formData: FormData): Promise<BookmarkState> {
  const start = performance.now()

  try {
    const validatedFields = BookmarkSchema.safeParse({
      postId: formData.get('postId'),
      title: formData.get('title'),
      userId: formData.get('userId'),
      sitemapUrl: formData.get('sitemapUrl') ?? null,
      isBookmarked: formData.get('isBookmarked') === 'true'
    })

    if (!validatedFields.success) {
      console.error('Validation error:', validatedFields.error)
      return {
        success: false,
        error: BOOKMARK_ERRORS.INVALID_DATA.message
      }
    }

    const result = await toggleBookmark(
      validatedFields.data.postId,
      validatedFields.data.title,
      validatedFields.data.userId,
      validatedFields.data.sitemapUrl ?? null,
      validatedFields.data.isBookmarked
    )

    // Calculate duration
    const duration = performance.now() - start

    // Next.js 15 headers handling
    const headersList = await headers()
    try {
      const mutableHeaders = new Headers(headersList)
      mutableHeaders.set('Server-Timing', `bookmark;dur=${duration}`)
      // Apply the headers
      Object.entries(Object.fromEntries(mutableHeaders)).forEach(([key, value]) => {
        headersList.set(key, value)
      })
    } catch (e) {
      // Log but don't fail if headers can't be set
      console.warn('Could not set timing header:', e)
    }

    return result
  } catch (error) {
    console.error('Bookmark action failed:', error)
    return {
      success: false,
      error: BOOKMARK_ERRORS.OPERATION_FAILED.message
    }
  }
} 