'use client';

import { SitemapMetaPreview } from '@/app/components/SitemapMetaPreview/Client';

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