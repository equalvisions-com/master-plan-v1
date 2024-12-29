'use server'

import { toggleBookmark } from './bookmark'
import { BookmarkState } from '@/app/types/bookmark'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Define errors inline since we can't find the constants file
const BOOKMARK_ERRORS = {
  INVALID_DATA: {
    code: 'INVALID_DATA',
    message: 'Invalid bookmark data provided'
  },
  AUTH_REQUIRED: {
    code: 'AUTH_REQUIRED',
    message: 'Authentication required to manage bookmarks'
  },
  OPERATION_FAILED: {
    code: 'OPERATION_FAILED',
    message: 'Failed to update bookmark'
  }
} as const

const BookmarkSchema = z.object({
  postId: z.string().min(1, { message: 'Post ID is required' }),
  title: z.string().min(1, { message: 'Title is required' }),
  userId: z.string().uuid({ message: 'Valid user ID is required' }),
  sitemapUrl: z.string().url({ message: 'Valid URL is required' }),
  isBookmarked: z.boolean()
})

type BookmarkInput = z.infer<typeof BookmarkSchema>

async function handleBookmarkToggle(input: BookmarkInput): Promise<BookmarkState> {
  try {
    await toggleBookmark(
      input.postId,
      input.title,
      input.userId,
      input.isBookmarked,
      input.sitemapUrl
    )
    
    return {
      message: input.isBookmarked ? 'Bookmark removed' : 'Bookmark added',
      error: null
    }
  } catch (error) {
    logger.error('Bookmark action failed:', error)
    return {
      message: null,
      error: BOOKMARK_ERRORS.OPERATION_FAILED.message
    }
  }
}

export async function bookmarkAction(
  prevState: BookmarkState,
  formData: FormData
): Promise<BookmarkState> {
  const validatedFields = BookmarkSchema.safeParse({
    postId: formData.get('postId'),
    title: formData.get('title'),
    userId: formData.get('userId'),
    sitemapUrl: formData.get('sitemapUrl'),
    isBookmarked: formData.get('isBookmarked') === 'true'
  })

  if (!validatedFields.success) {
    return {
      message: null,
      error: BOOKMARK_ERRORS.INVALID_DATA.message
    }
  }

  return handleBookmarkToggle(validatedFields.data)
} 