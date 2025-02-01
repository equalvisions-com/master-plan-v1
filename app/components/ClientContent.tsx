'use client';

import { SitemapMetaPreview } from '@/app/components/SitemapMetaPreview/Client';
import type { WordPressPost } from '@/types/wordpress';
import type { SitemapEntry } from '@/lib/sitemap/types';

export function ClientContent({ post, metaEntries }: { 
  post: WordPressPost;
  metaEntries: SitemapEntry[];
}) {
  return (
    <article className="max-w-4xl">
      <div className="space-y-8">
        <SitemapMetaPreview 
          initialEntries={metaEntries}
          initialHasMore={false}
          sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
        />
      </div>
    </article>
  );
} 