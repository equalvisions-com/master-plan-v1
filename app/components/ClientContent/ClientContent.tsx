import type { WordPressPost } from '@/types/wordpress';
import type { SitemapEntry } from '@/app/lib/sitemap/types';
import { User } from '@supabase/supabase-js';

interface ClientContentProps {
  post: WordPressPost;
  metaEntries: SitemapEntry[];
  initialLikedUrls: string[];
  initialHasMore: boolean;
  user: User | null;
}

export function ClientContent({
  post,
  metaEntries,
  initialLikedUrls,
  initialHasMore,
  user
}: ClientContentProps) {
  // Component implementation
} 