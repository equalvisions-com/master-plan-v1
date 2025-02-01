'use client';

import { SitemapMetaPreview } from '@/app/components/SitemapMetaPreview/Client';
import type { WordPressPost } from '@/types/wordpress';
import type { SitemapEntry } from '@/lib/sitemap/types';

interface ClientContentProps {
  post: WordPressPost;
  metaEntries: SitemapEntry[];
  initialLikedUrls: string[];
  initialHasMore: boolean;
}

export function ClientContent({ 
  post, 
  metaEntries,
  initialLikedUrls,
  initialHasMore
}: ClientContentProps) {
  return (
    <article className="max-w-4xl">
      <div className="space-y-8">
        <SitemapMetaPreview 
          initialEntries={metaEntries}
          initialLikedUrls={initialLikedUrls}
          initialHasMore={initialHasMore}
          sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
        />
      </div>
    </article>
  );
} 