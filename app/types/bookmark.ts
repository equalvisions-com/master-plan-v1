import { z } from 'zod'

export const BookmarkSchema = z.object({
  postId: z.string().min(1),
  title: z.string().min(1),
  userId: z.string().min(1),
  sitemapUrl: z.union([
    z.string(),
    z.null(),
    z.undefined()
  ]).nullable(),
  isBookmarked: z.boolean(),
  featuredImage: z.union([
    z.string(),
    z.null(),
    z.undefined()
  ]).nullable()
})

export type Bookmark = z.infer<typeof BookmarkSchema>

export interface BookmarkState {
  success: boolean
  message?: string
  error?: string
} 