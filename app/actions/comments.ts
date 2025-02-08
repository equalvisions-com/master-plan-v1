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
        user: {
          select: {
            id: true,
            email: true
          }
        }
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
        user: {
          select: {
            id: true,
            email: true
          }
        }
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

export async function deleteComment(commentId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('Delete comment: User not authenticated')
      return { error: 'Not authenticated', success: false }
    }

    // Verify the comment belongs to the user
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { 
        user_id: true,
        url: true 
      }
    })

    if (!comment) {
      console.error('Delete comment: Comment not found', { commentId })
      return { error: 'Comment not found', success: false }
    }

    console.log('Delete comment: Comparing user IDs', {
      commentUserId: comment.user_id,
      currentUserId: user.id
    })

    if (comment.user_id !== user.id) {
      console.error('Delete comment: Unauthorized', {
        commentUserId: comment.user_id,
        currentUserId: user.id
      })
      return { error: 'Not authorized to delete this comment', success: false }
    }

    await prisma.comment.delete({
      where: { id: commentId }
    })

    // Revalidate the specific URL path where the comment was made
    if (comment.url) {
      revalidatePath(`/[categorySlug]/[postSlug]`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return { error: 'Failed to delete comment', success: false }
  }
} 
