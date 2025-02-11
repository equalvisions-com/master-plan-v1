'use client';

import { SitemapMetaPreview } from '@/app/components/SitemapMetaPreview/Client';
import type { WordPressPost } from '@/types/wordpress';
import type { SitemapEntry } from '@/app/lib/sitemap/types';

interface ClientContentProps {
  post: WordPressPost;
  metaEntries: SitemapEntry[];
  initialLikedUrls: string[];
  initialHasMore: boolean;
  initialTotal: number;
  userId?: string | null;
}

export function ClientContent({ 
  post, 
  metaEntries,
  initialLikedUrls,
  initialHasMore,
  initialTotal,
  userId
}: ClientContentProps) {
  return (
    <article className="max-w-4xl">
      <div className="space-y-8">
        <SitemapMetaPreview 
          initialEntries={metaEntries}
          initialLikedUrls={initialLikedUrls}
          initialHasMore={initialHasMore}
          initialTotal={initialTotal}
          sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
          userId={userId}
        />
      </div>
    </article>
  );
} 