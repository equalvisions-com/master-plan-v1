import { z } from 'zod'

export const BookmarkSchema = z.object({
  postId: z.string().min(1),
  title: z.string().min(1),
  userId: z.string().min(1),
  sitemapUrl: z.string().url(),
  isBookmarked: z.boolean()
})

export type Bookmark = z.infer<typeof BookmarkSchema>

export interface BookmarkState {
  success: boolean
  message?: string
  error?: string
} 