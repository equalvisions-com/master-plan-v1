'use server'

import { toggleBookmark } from './bookmark'
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
  sitemapUrl: z.string().url().nullable(),
  isBookmarked: z.boolean()
})

export async function bookmarkAction(formData: FormData): Promise<BookmarkState> {
  try {
    const validatedFields = BookmarkSchema.safeParse({
      postId: formData.get('postId'),
      title: formData.get('title'),
      userId: formData.get('userId'),
      sitemapUrl: formData.get('sitemapUrl') || null,
      isBookmarked: formData.get('isBookmarked') === 'true'
    })

    if (!validatedFields.success) {
      console.error('Validation error:', validatedFields.error)
      return {
        success: false,
        error: BOOKMARK_ERRORS.INVALID_DATA.message,
        message: undefined
      }
    }

    // Create a new FormData object with validated fields
    const bookmarkFormData = new FormData()
    bookmarkFormData.append('postId', validatedFields.data.postId)
    bookmarkFormData.append('userId', validatedFields.data.userId)
    bookmarkFormData.append('title', validatedFields.data.title)
    bookmarkFormData.append('sitemapUrl', validatedFields.data.sitemapUrl || '')

    const result = await toggleBookmark(bookmarkFormData)

    if (!result.isBookmarked) {
      return {
        success: true,
        message: 'Bookmark removed',
        error: undefined
      }
    }

    revalidatePath('/bookmarks')
    revalidatePath('/profile')
    if (validatedFields.data.sitemapUrl) {
      revalidatePath(validatedFields.data.sitemapUrl)
    }

    return {
      success: true,
      message: 'Post bookmarked',
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