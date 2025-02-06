'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { addComment, deleteComment, getComments } from '@/lib/redis'
import { revalidatePath } from 'next/cache'

export async function addCommentAction(url: string, content: string) {
  try {
    const supabase = createServerActionClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      throw new Error('User not authenticated')
    }

    const comment = await addComment({
      content,
      url,
      user: {
        id: session.user.id,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Anonymous',
        email: session.user.email || null
      }
    })

    if (!comment) {
      throw new Error('Failed to add comment')
    }

    revalidatePath(url)
    return { success: true, comment }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add comment' }
  }
}

export async function deleteCommentAction(url: string, commentId: string) {
  try {
    const supabase = createServerActionClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      throw new Error('User not authenticated')
    }

    const comments = await getComments(url)
    const comment = comments.find(c => c.id === commentId)

    if (!comment) {
      throw new Error('Comment not found')
    }

    if (comment.user.id !== session.user.id) {
      throw new Error('Unauthorized')
    }

    const success = await deleteComment(url, commentId)
    if (!success) {
      throw new Error('Failed to delete comment')
    }

    revalidatePath(url)
    return { success: true }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete comment' }
  }
}

export async function getCommentsAction(url: string) {
  try {
    const comments = await getComments(url)
    return { success: true, comments }
  } catch (error) {
    console.error('Error fetching comments:', error)
    return { success: false, error: 'Failed to fetch comments' }
  }
} 
