import type { SitemapEntry } from '@/app/lib/sitemap/types';

export interface FeedResponse {
  entries: SitemapEntry[];
  hasMore: boolean;
  total: number;
  nextCursor: string | null;
}

export interface FeedClientProps {
  initialData: FeedResponse;
  userId: string;
} 