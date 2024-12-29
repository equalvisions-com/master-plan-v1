'use server'

import { prisma } from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { BOOKMARK_ERRORS } from '@/app/constants/errors'
import { logger } from '@/lib/logger'
import { unstable_cache } from 'next/cache'

interface BookmarkStatusResponse {
  success: boolean
  error?: string
}

// Separate the database query into a cached function
const getCachedBookmarkStatus = unstable_cache(
  async (postId: string, userId: string) => {
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        user_id_post_id: {
          user_id: userId,
          post_id: postId
        }
      },
      select: {
        id: true
      }
    })

    return { exists: !!bookmark }
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
    const { exists } = await getCachedBookmarkStatus(postId, userId)

    if (!exists) {
      return {
        success: true,
        error: undefined
      }
    }

    revalidateTag(`bookmark-${postId}`)
    revalidateTag('bookmark-status')
    
    return { 
      success: true,
      error: undefined
    }
  } catch (error) {
    logger.error('Bookmark status check failed:', { error, postId, userId })
    return { 
      success: false, 
      error: BOOKMARK_ERRORS.OPERATION_FAILED.message 
    }
  }
} 