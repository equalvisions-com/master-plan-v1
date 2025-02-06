'use server'

import { Redis } from '@upstash/redis'
// import { revalidatePath } from 'next/cache'

// Use environment variables or a shared lib that exports your configured Redis client
const redis = Redis.fromEnv()

// Key format: "sitemap:comments:<normalizedUrl>"
function getKeyForComments(normalizedUrl: string) {
  return `sitemap:comments:${normalizedUrl}`
}

/**
 * Retrieve comments from Upstash Redis
 */
export async function getComments(normalizedUrl: string) {
  const key = getKeyForComments(normalizedUrl)
  const data = await redis.get<string>(key)
  if (!data) {
    return []
  }

  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * Add a new comment
 */
export async function addComment({
  normalizedUrl,
  userId,
  content,
  userName,
}: {
  normalizedUrl: string
  userId: string
  content: string
  userName?: string
}) {
  const key = getKeyForComments(normalizedUrl)
  const existing = await getComments(normalizedUrl)

  const newComment = {
    id: Date.now(),           // or use something unique
    authorId: userId,
    authorName: userName ?? 'Anonymous',
    content,
    timestamp: new Date().toISOString(),
  }

  existing.push(newComment)
  await redis.set(key, JSON.stringify(existing))

  // Revalidate if you want any server components updated:
  // revalidatePath('/pathThatShowsComments')

  return newComment
} 