'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { revalidatePath, revalidateTag } from 'next/cache'

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

    const { data: bookmarks, error: dbError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle()

    if (dbError && dbError.code !== 'PGRST116') {
      logger.error('Database error in getBookmarkStatus:', dbError)
    }

    return { 
      isBookmarked: !!bookmarks,
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
  const supabase = await createClient()
  
  try {
    if (isBookmarked) {
      // First check if the bookmark exists
      const { data: existingBookmark } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .maybeSingle();

      if (!existingBookmark) {
        return { success: true }; // This might be causing the issue
      }

      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      if (error) throw error;
    } else {
      // Adding a bookmark
      const { error } = await supabase
        .from('bookmarks')
        .insert([{
          user_id: userId,
          post_id: postId,
          title: title,
          sitemap_url: sitemapUrl
        }])
        .select('*')
        .single();

      if (error) throw error;
    }

    // Add proper return value
    return { success: true, isBookmarked: !isBookmarked };
  } catch (error) {
    console.error('Bookmark toggle error:', error);
    throw error;
  }
} 