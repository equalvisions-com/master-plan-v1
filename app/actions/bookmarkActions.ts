'use server'

import { toggleBookmark } from './bookmark'
import { BookmarkState } from '@/app/types/bookmark'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

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
  ),
  shouldRevalidateProfile: z.union([z.boolean(), z.string()]).transform(val =>
    typeof val === 'string' ? val === 'true' : val
  ).optional()
})

type BookmarkInput = z.infer<typeof BookmarkSchema>

export async function bookmarkAction(formData: FormData): Promise<BookmarkState> {
  try {
    const validatedFields = BookmarkSchema.safeParse({
      postId: formData.get('postId'),
      title: formData.get('title'),
      userId: formData.get('userId'),
      sitemapUrl: formData.get('sitemapUrl'),
      isBookmarked: formData.get('isBookmarked') === 'true'
    });

    if (!validatedFields.success) {
      return {
        message: null,
        error: BOOKMARK_ERRORS.INVALID_DATA.message
      };
    }

    await toggleBookmark(
      validatedFields.data.postId,
      validatedFields.data.title,
      validatedFields.data.userId,
      validatedFields.data.isBookmarked,
      validatedFields.data.sitemapUrl
    );

    // Revalidate paths after successful action
    revalidatePath('/bookmarks');
    revalidatePath('/profile');
    if (validatedFields.data.sitemapUrl) {
      revalidatePath(validatedFields.data.sitemapUrl);
    }

    return {
      message: validatedFields.data.isBookmarked ? 'Bookmark removed' : 'Bookmark added',
      error: null
    };
  } catch (error) {
    console.error('Bookmark action failed:', error);
    return {
      message: null,
      error: BOOKMARK_ERRORS.OPERATION_FAILED.message
    };
  }
} 