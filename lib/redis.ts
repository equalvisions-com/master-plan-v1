import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Internal comment type with all fields
interface InternalComment {
  id: string
  content: string
  user: {
    id: string
    name: string | null
    email: string | null
  }
  createdAt: string
  url: string
}

// Public comment type with only necessary fields
export type Comment = {
  id: string
  content: string
  user: {
    id: string
    name: string | null
  }
  createdAt: string
  url: string
}

export async function getComments(url: string): Promise<InternalComment[]> {
  try {
    const comments = await redis.lrange<InternalComment>(`comments:${url}`, 0, -1) || []
    return comments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch (error) {
    console.error('Error fetching comments:', error)
    return []
  }
}

export async function addComment(comment: Omit<InternalComment, 'id' | 'createdAt'>): Promise<InternalComment | null> {
  try {
    const id = crypto.randomUUID()
    const newComment: InternalComment = {
      ...comment,
      id,
      createdAt: new Date().toISOString(),
    }
    
    await redis.lpush(`comments:${comment.url}`, newComment)
    return newComment
  } catch (error) {
    console.error('Error adding comment:', error)
    return null
  }
}

export async function deleteComment(url: string, commentId: string): Promise<boolean> {
  try {
    const comments = await getComments(url)
    const updatedComments = comments.filter(comment => comment.id !== commentId)
    
    await redis.del(`comments:${url}`)
    if (updatedComments.length > 0) {
      await redis.rpush(
        `comments:${url}`,
        ...updatedComments
      )
    }
    
    return true
  } catch (error) {
    console.error('Error deleting comment:', error)
    return false
  }
} 