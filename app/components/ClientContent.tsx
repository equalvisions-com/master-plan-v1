'use client';

import { SitemapMetaPreview } from '@/app/components/SitemapMetaPreview/Client';
import type { WordPressPost } from '@/types/wordpress';
import type { SitemapEntry } from '@/app/lib/sitemap/types';
import type { User } from '@/types/user';

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
  return (
    <article className="max-w-4xl">
      <div className="space-y-8">
        <SitemapMetaPreview 
          initialEntries={metaEntries}
          initialLikedUrls={initialLikedUrls}
          initialHasMore={initialHasMore}
          sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
          user={user}
        />
      </div>
    </article>
  );
} 