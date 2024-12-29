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
  userId: z.string().min(1, { message: 'User ID is required' }),
  sitemapUrl: z.string().min(1, { message: 'URL is required' }),
  isBookmarked: z.union([z.boolean(), z.string()]).transform(val => 
    typeof val === 'string' ? val === 'true' : val
  )
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
  formData: FormData
): Promise<BookmarkState> {
  const data = {
    postId: formData.get('postId') as string,
    title: formData.get('title') as string,
    userId: formData.get('userId') as string,
    sitemapUrl: formData.get('sitemapUrl') as string,
    isBookmarked: formData.get('isBookmarked') === 'true'
  }
  
  logger.debug('Bookmark action input:', {
    ...data,
    hasSitemapUrl: !!data.sitemapUrl
  })
  
  const validatedFields = BookmarkSchema.safeParse(data)

  if (!validatedFields.success) {
    logger.error('Bookmark validation failed:', validatedFields.error)
    return {
      message: null,
      error: `${BOOKMARK_ERRORS.INVALID_DATA.message}: ${validatedFields.error.errors.map(e => e.message).join(', ')}`
    }
  }

  return await handleBookmarkToggle(validatedFields.data)
} 