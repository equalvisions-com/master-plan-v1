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
} 