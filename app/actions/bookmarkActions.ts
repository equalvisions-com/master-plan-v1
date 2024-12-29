'use server'

import { toggleBookmarkAction } from './bookmark'
import { BookmarkState } from '@/app/types/bookmark'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const BOOKMARK_ERRORS = {
  INVALID_DATA: {
    code: 'INVALID_DATA',
    message: 'Invalid bookmark data provided'
  },
  OPERATION_FAILED: {
    code: 'OPERATION_FAILED',
    message: 'Failed to update bookmark'
  }
} as const

const BookmarkSchema = z.object({
  postId: z.string().min(1),
  title: z.string().min(1),
  userId: z.string().min(1),
  sitemapUrl: z.string().url(),
  isBookmarked: z.boolean()
})

export async function bookmarkAction(formData: FormData): Promise<BookmarkState> {
  try {
    const validatedFields = BookmarkSchema.safeParse({
      postId: formData.get('postId'),
      title: formData.get('title'),
      userId: formData.get('userId'),
      sitemapUrl: formData.get('sitemapUrl'),
      isBookmarked: formData.get('isBookmarked') === 'true'
    })

    if (!validatedFields.success) {
      return {
        success: false,
        error: BOOKMARK_ERRORS.INVALID_DATA.message,
        message: undefined
      }
    }

    const result = await toggleBookmarkAction(
      validatedFields.data.postId,
      validatedFields.data.title,
      validatedFields.data.userId,
      validatedFields.data.sitemapUrl,
      validatedFields.data.isBookmarked
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: undefined
      }
    }

    return {
      success: true,
      message: validatedFields.data.isBookmarked ? 'Bookmark removed' : 'Post bookmarked',
      error: undefined
    }
  } catch (error) {
    console.error('Bookmark action failed:', error)
    return {
      success: false,
      error: BOOKMARK_ERRORS.OPERATION_FAILED.message,
      message: undefined
    }
  }
} 