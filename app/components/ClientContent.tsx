'use client';

import { useMemo } from 'react';
import type { WordPressPost } from '@/types/wordpress';
import { SitemapMetaPreview } from '@/app/components/SitemapMetaPreview';
import type { SitemapEntry } from '@/lib/sitemap/types';

export function ClientContent({ post, metaEntries }: { 
  post: WordPressPost;
  metaEntries: SitemapEntry[];
}) {
  return (
    <article className="max-w-4xl">
      <div className="space-y-8">
        <SitemapMetaPreview post={post} initialEntries={metaEntries} />
      </div>
    </article>
  );
} 