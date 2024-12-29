'use server'

import { prisma } from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { BOOKMARK_ERRORS } from '@/app/constants/errors'
import { logger } from '@/lib/logger'
import { cache } from 'react'

interface BookmarkStatusResponse {
  isBookmarked: boolean
  error?: string
}

// Cache the bookmark status check at the request level
export const getBookmarkStatus = cache(async (
  postId: string, 
  userId: string
): Promise<BookmarkStatusResponse> => {
  try {
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

    return { 
      isBookmarked: !!bookmark,
      error: undefined
    }
  } catch (error) {
    logger.error('Failed to fetch bookmark status:', { error, postId, userId })
    return { 
      isBookmarked: false,
      error: BOOKMARK_ERRORS.OPERATION_FAILED.message 
    }
  }
}) 