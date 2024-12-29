'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import { BOOKMARK_ERRORS } from '@/app/constants/errors'
import { logger } from '@/lib/logger'
import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

interface BookmarkStatusResponse {
  success: boolean
  error?: string
}

// Separate the database query into a cached function
const getCachedBookmarkStatus = unstable_cache(
  async (postId: string, userId: string, supabase: SupabaseClient) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single()

    return { exists: !!data, error }
  },
  ['bookmark-status'],
  {
    revalidate: 60,
    tags: ['bookmark-status']
  }
)

export async function checkBookmarkStatus(
  postId: string, 
  userId: string
): Promise<BookmarkStatusResponse> {
  try {
    // Create Supabase client outside of cached function
    const supabase = await createClient()
    
    // Use the cached function for the database query
    const { exists, error } = await getCachedBookmarkStatus(postId, userId, supabase)

    if (error && error.code !== 'PGRST116') {
      logger.error('Bookmark status check failed:', { error, postId, userId })
      return {
        success: false,
        error: BOOKMARK_ERRORS.OPERATION_FAILED.message
      }
    }

    revalidateTag(`bookmark-${postId}`)
    revalidateTag('bookmark-status')
    
    return { 
      success: true,
      error: undefined
    }
  } catch (error) {
    logger.error('Unexpected error in bookmark status check:', { error, postId, userId })
    return { 
      success: false, 
      error: BOOKMARK_ERRORS.OPERATION_FAILED.message 
    }
  }
} 