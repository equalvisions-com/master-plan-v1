import { z } from 'zod'

export interface BookmarkState {
  message: string | null
  error: string | null
}

export interface BookmarkError {
  code: string
  message: string
}

export const bookmarkSchema = z.object({
  postId: z.string().min(1),
  sitemapUrl: z.string().url().optional(),
  title: z.string().min(1),
}) 