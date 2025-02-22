export interface SitemapEntry {
  url: string;
  lastmod: string;
  meta: {
    title: string;
    description?: string;
    image?: string;
    platform?: string;
  };
  isLiked?: boolean;
  commentCount?: number;
  likeCount?: number;
} 