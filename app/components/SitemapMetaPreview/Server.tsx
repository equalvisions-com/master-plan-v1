import { Suspense } from 'react';
import type { WordPressPost } from '@/types/wordpress';
import type { SitemapEntry } from '@/lib/sitemap/types';
import { SitemapMetaPreview } from './Client';
import { logger } from '@/lib/logger';
import { cacheSitemapEntries, getSitemapPage } from '@/lib/sitemap/sitemap-service';

async function getMetaEntries(post: WordPressPost) {
  if (!post.sitemapUrl?.sitemapurl) return { entries: [], hasMore: false, total: 0 };
  
  try {
    const result = await getSitemapPage(post.sitemapUrl.sitemapurl, 1);
    return {
      entries: result.entries,
      hasMore: result.hasMore,
      total: result.total
    };
  } catch (error) {
    logger.error('Failed to fetch meta entries:', error);
    return { entries: [], hasMore: false, total: 0 };
  }
}

export async function SitemapMetaPreviewServer({ post }: { post: WordPressPost }) {
  try {
    const { entries: metaEntries, hasMore, total } = await getMetaEntries(post);
    
    if (!metaEntries?.length) {
      return null;
    }

    const filteredEntries = metaEntries
      .filter(entry => entry.url.includes('/p/'))
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());

    return filteredEntries.length ? (
      <SitemapMetaPreview 
        initialEntries={filteredEntries}
        initialHasMore={hasMore}
        initialTotal={total}
        sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
      />
    ) : null;
  } catch (error) {
    logger.error('Error in SitemapMetaPreviewServer:', error);
    return null;
  }
} 