'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { addComment, deleteComment, getComments } from '@/lib/redis'
import { revalidatePath } from 'next/cache'

export async function addCommentAction(url: string, content: string) {
  const cookieStore = cookies()
  try {
    const supabase = createServerActionClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const comment = await addComment({
      content,
      url,
      user: {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
        email: user.email || null
      }
    })

    if (!comment) {
      throw new Error('Failed to add comment')
    }

    revalidatePath(url)
    return { success: true, comment }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { success: false, error: 'Failed to add comment' }
  }
}

export async function deleteCommentAction(url: string, commentId: string) {
  const cookieStore = cookies()
  try {
    const supabase = createServerActionClient({ cookies: () => cookieStore })
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
    return { success: false, error: 'Failed to delete comment' }
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
