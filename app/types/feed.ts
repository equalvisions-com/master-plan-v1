export interface SitemapEntry {
  url: string
  meta: {
    title: string
    description: string
    image?: string
  }
  lastmod: string
  sourceKey: string
}

export interface FeedEntryType extends SitemapEntry {
  commentCount: number
  likeCount: number
  sitemap: {
    title: string
    featured_image?: string
  }
}

export const ITEMS_PER_PAGE = 20

export interface ProcessedResult {
  entries: SitemapEntry[]
  hasMore: boolean
  total: number
  nextCursor: number | null
}

export interface PaginationResult {
  entries: SitemapEntry[]
  hasMore: boolean
  total: number
  nextCursor: number | null
  currentPage: number
  processedUrls: string[]
  unprocessedUrls: string[]
} 