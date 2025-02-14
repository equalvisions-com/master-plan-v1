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

export interface PostNode {
  slug: string
  title: string
  featuredImage?: {
    node: {
      sourceUrl: string
      altText: string
    }
  }
}

export interface PostsData {
  posts: {
    nodes: PostNode[]
  }
}

export interface FeedEntryType extends SitemapEntry {
  commentCount: number
  likeCount: number
  post?: {
    title: string
    featuredImage?: {
      node: {
        sourceUrl: string
        altText: string
      }
    }
    slug: string
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
} 