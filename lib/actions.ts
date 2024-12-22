'use server'

import { revalidateTag } from 'next/cache'

export async function revalidateTags(tags: string[]) {
  try {
    await Promise.all(tags.map(tag => revalidateTag(tag)))
    return { success: true }
  } catch (error) {
    console.error('Failed to revalidate tags:', error)
    return { success: false, error }
  }
} 