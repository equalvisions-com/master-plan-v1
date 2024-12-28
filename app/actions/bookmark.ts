'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function getBookmarkStatus(postId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      logger.error('Auth error in getBookmarkStatus:', authError)
      return { isBookmarked: false, userId: null }
    }
    
    if (!user) {
      return { isBookmarked: false, userId: null }
    }

    const { data: bookmark, error: dbError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single()

    if (dbError) {
      logger.error('Database error in getBookmarkStatus:', dbError)
    }

    return { 
      isBookmarked: !!bookmark,
      userId: user.id
    }
  } catch (error) {
    logger.error('Unexpected error in getBookmarkStatus:', error)
    return { isBookmarked: false, userId: null }
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
  
  try {
    if (isBookmarked) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId)

      if (error) throw error
      
      logger.info('Bookmark deleted successfully')
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert([
          {
            user_id: userId,
            post_id: postId,
            title: title,
            sitemapUrl: sitemapUrl
          }
        ])

      if (error) throw error
      
      logger.info('Bookmark created successfully')
    }
    
    return { success: true }
  } catch (error) {
    logger.error('Error in toggleBookmark:', error)
    throw error
  }
} 