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
  console.log('Debug toggleBookmark - Start:', {
    postId,
    title,
    userId,
    isBookmarked,
    sitemapUrl,
    sitemapUrlType: typeof sitemapUrl
  });

  const supabase = await createClient()
  
  try {
    if (isBookmarked) {
      console.log('Attempting to delete bookmark...');
      // First check if the bookmark exists
      const { data: existingBookmark } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .maybeSingle();

      if (!existingBookmark) {
        console.log('No bookmark found to delete, returning success');
        return { success: true };
      }

      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      if (error) {
        console.error('Delete bookmark error:', error);
        throw error;
      }
      console.log('Bookmark deleted successfully');
    } else {
      // Validate sitemapUrl before inserting
      if (!sitemapUrl || typeof sitemapUrl !== 'string') {
        console.error('Invalid sitemapUrl:', sitemapUrl);
        throw new Error('Invalid sitemap URL provided');
      }

      const bookmarkData = {
        user_id: userId,
        post_id: postId,
        title: title,
        sitemapUrl: sitemapUrl.trim() // Ensure no whitespace
      };
      
      console.log('Attempting to insert bookmark:', {
        ...bookmarkData,
        sitemapUrlLength: bookmarkData.sitemapUrl.length
      });
      
      // First check if bookmark already exists
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .maybeSingle();

      if (existing) {
        console.log('Bookmark already exists:', existing);
        return { success: true };
      }

      const { data, error } = await supabase
        .from('bookmarks')
        .insert([bookmarkData])
        .select();

      if (error) {
        console.error('Insert bookmark error:', {
          error,
          bookmarkData,
          errorCode: error.code,
          details: error.details
        });
        throw error;
      }
      console.log('Bookmark inserted successfully:', data);
    }
    
    console.log('Revalidating cache...');
    revalidateTag('bookmarks');
    revalidateTag(`post-${postId}`);
    revalidateTag(`user-${userId}-bookmarks`);
    revalidatePath('/bookmarks');
    revalidatePath(sitemapUrl);
    
    return { success: true };
  } catch (error) {
    console.error('Error in toggleBookmark:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
} 