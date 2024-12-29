'use server'

import { prisma } from '@/lib/prisma'
import { revalidateTag, revalidatePath } from 'next/cache'
import { BookmarkSchema } from '@/app/types/bookmark'
import type { BookmarkState } from '@/app/types/bookmark'

export async function toggleBookmarkAction(
  postId: string,
  title: string,
  userId: string,
  sitemapUrl: string | null,
  isBookmarked: boolean
): Promise<BookmarkState> {
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
          sitemapUrl: sitemapUrl || ''
        },
        update: {} // No updates needed since we're just ensuring it exists
      })
    }

    // Cache invalidation
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

export async function getBookmarkStatus(postId: string, userId: string) {
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
} 