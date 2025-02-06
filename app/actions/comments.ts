'use server'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { addComment, deleteComment, getComments } from '@/lib/redis'
import { revalidatePath } from 'next/cache'

export async function addCommentAction(url: string, content: string) {
  const cookieStore = cookies()
  try {
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Only pass necessary user data to Redis
    const comment = await addComment({
      content,
      url,
      user: {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
        email: null // Don't store email in comments
      }
    })

    if (!comment) {
      throw new Error('Failed to add comment')
    }

    revalidatePath(url)
    // Only return necessary comment data
    return { 
      success: true, 
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        url: comment.url,
        user: {
          id: comment.user.id,
          name: comment.user.name
        }
      }
    }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add comment' }
  }
}

export async function deleteCommentAction(url: string, commentId: string) {
  const cookieStore = cookies()
  try {
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const comments = await getComments(url)
    const comment = comments.find(c => c.id === commentId)

    if (!comment) {
      throw new Error('Comment not found')
    }

    if (comment.user.id !== user.id) {
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
    // Filter out sensitive data before sending to client
    const sanitizedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      url: comment.url,
      user: {
        id: comment.user.id,
        name: comment.user.name
      }
    }))
    return { success: true, comments: sanitizedComments }
  } catch (error) {
    console.error('Error fetching comments:', error)
    return { success: false, error: 'Failed to fetch comments' }
  }
} 
