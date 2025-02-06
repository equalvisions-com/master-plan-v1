'use client';

import { SitemapMetaPreview } from '@/app/components/SitemapMetaPreview/Client';
import type { WordPressPost } from '@/types/wordpress';
import type { SitemapEntry } from '@/app/lib/sitemap/types';
import type { User } from '@supabase/auth-helpers-nextjs';

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
    <div className="space-y-8">
      <article 
        className="prose prose-quoteless prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content || '' }}
      />

      {metaEntries.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Referenced Links</h2>
          <SitemapMetaPreview
            initialEntries={metaEntries}
            initialLikedUrls={initialLikedUrls}
            initialHasMore={initialHasMore}
            sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
            user={user}
          />
        </div>
      )}
    </div>
  );
} 