'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { revalidateTag } from 'next/cache'
import { Comment, User } from '@prisma/client'

interface CommentWithUser extends Comment {
  user: Pick<User, 'email'>
}

interface CommentResponse {
  id: string
  content: string
  author: string | null
  authorId: string
  createdAt: Date
  url: string
}

interface AddCommentResult {
  success: boolean
  comment?: CommentResponse
  error?: string
}

export async function addComment(url: string, content: string): Promise<AddCommentResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        user_id: user.id,
        url: normalizeUrl(url),
        content,
      },
      include: {
        user: {
          select: {
            email: true,
          }
        }
      }
    }) as CommentWithUser;

    await revalidateTag(`comments-${normalizeUrl(url)}`);

    return { 
      success: true, 
      comment: {
        id: comment.id,
        content: comment.content,
        author: comment.user.email,
        authorId: comment.user_id,
        createdAt: comment.created_at,
        url: comment.url
      }
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: 'Failed to add comment' };
  }
}

export async function getComments(url: string): Promise<CommentResponse[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }

  try {
    const comments = await prisma.comment.findMany({
      where: {
        url: normalizeUrl(url)
      },
      include: {
        user: {
          select: {
            email: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    }) as CommentWithUser[];

    return comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: comment.user.email,
      authorId: comment.user_id,
      createdAt: comment.created_at,
      url: comment.url
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
} 