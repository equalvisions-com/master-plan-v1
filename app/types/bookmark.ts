import { z } from 'zod'

// Define the WordPress SitemapUrl structure
const SitemapUrlSchema = z.object({
  fieldGroupName: z.string(),
  sitemapurl: z.string().url().nullish(),
}).nullable().transform(val => val?.sitemapurl ?? null)

export const BookmarkSchema = z.object({
  postId: z.string().min(1),
  title: z.string().min(1),
  userId: z.string().min(1),
  sitemapUrl: z.union([
    z.string().url().nullish(),
    SitemapUrlSchema
  ]),
  isBookmarked: z.boolean()
})

export type Bookmark = z.infer<typeof BookmarkSchema>

export interface BookmarkState {
  success: boolean
  message?: string
  error?: string
} 