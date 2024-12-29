'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import { BOOKMARK_ERRORS } from '@/app/constants/errors'

interface BookmarkStatusResponse {
  success: boolean
  error?: string
}

export async function checkBookmarkStatus(
  postId: string, 
  userId: string
): Promise<BookmarkStatusResponse> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return {
        success: false,
        error: BOOKMARK_ERRORS.OPERATION_FAILED.message
      }
    }

    revalidateTag(`bookmark-${postId}`)
    revalidateTag('bookmark-status')
    
    return { success: true }
  } catch (err) {
    return { 
      success: false, 
      error: BOOKMARK_ERRORS.OPERATION_FAILED.message 
    }
  }
} 