'use server'

import { prisma } from '@/lib/prisma'
import { revalidateTag, revalidatePath, unstable_cache } from 'next/cache'
import { BookmarkSchema } from '@/app/types/bookmark'
import type { BookmarkState } from '@/app/types/bookmark'

export async function toggleBookmarkAction(
  postId: string,
  title: string,
  userId: string,
  sitemapUrl: string | null,
  isBookmarked: boolean,
  featuredImage?: string | null
): Promise<BookmarkState> {
  // Validate input data
  const validatedData = BookmarkSchema.safeParse({
    postId,
    title,
    userId,
    sitemapUrl,
    isBookmarked,
    featuredImage
  })

  if (!validatedData.success) {
    console.error('Validation error:', validatedData.error)
    return {
      success: false,
      error: 'Invalid bookmark data'
    }
  }

  try {
    if (isBookmarked) {
      // Delete bookmark if exists
      await prisma.bookmark.deleteMany({
        where: {
          user_id: userId,
          post_id: postId
        }
      })
    } else {
      // Create bookmark if doesn't exist
      await prisma.bookmark.upsert({
        where: {
          user_id_post_id: {
            user_id: userId,
            post_id: postId
          }
        },
        create: {
          user_id: userId,
          post_id: postId,
          title: title,
          sitemapUrl: sitemapUrl || '',
          featured_image: featuredImage || null
        },
        update: {} // No updates needed since we're just ensuring it exists
      })
    }

    // Revalidate caches
    revalidateTag('bookmarks')
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

export const getBookmarkStatus = unstable_cache(
  async (postId: string, userId: string) => {
    try {
      const bookmark = await prisma.bookmark.findUnique({
        where: {
          user_id_post_id: {
            user_id: userId,
            post_id: postId
          }
        }
      })

      return { isBookmarked: !!bookmark }
    } catch (error) {
      console.error('Failed to get bookmark status:', error)
      return { isBookmarked: false }
    }
  },
  ['bookmark-status'],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ['bookmarks'], // Add tag for cache invalidation
  }
) 