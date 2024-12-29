'use server'

import { toggleBookmark } from './bookmark'

export async function bookmarkAction(
  prevState: any,
  formData: FormData
): Promise<{ message: string | null; error: string | null }> {
  const postId = formData.get('postId') as string
  const title = formData.get('title') as string
  const userId = formData.get('userId') as string
  const sitemapUrl = formData.get('sitemapUrl') as string
  const isBookmarked = formData.get('isBookmarked') === 'true'

  try {
    await toggleBookmark(postId, title, userId, isBookmarked, sitemapUrl)
    return { message: 'Success', error: null }
  } catch (error) {
    return { message: null, error: 'Failed to update bookmark' }
  }
} 