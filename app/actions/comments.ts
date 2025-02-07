'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function createComment(url: string, content: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated', success: false }
    }

    const comment = await prisma.comment.create({
      data: {
        url,
        content,
        user_id: user.id,
      },
      include: {
        user: true
      }
    })

    revalidatePath(`/[categorySlug]/[postSlug]`)
    return { success: true, comment }
  } catch (error) {
    console.error('Error creating comment:', error)
    return { error: 'Failed to create comment', success: false }
  }
}

export async function getComments(url: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        url,
      },
      include: {
        user: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return { success: true, comments }
  } catch (error) {
    console.error('Error fetching comments:', error)
    return { error: 'Failed to fetch comments', success: false }
  }
} 
