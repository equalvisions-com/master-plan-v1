import { logger } from '@/lib/logger';
import { getSitemapPage } from '@/lib/sitemap/sitemap-service';
import { SitemapMetaPreview } from './Client';
import type { WordPressPost } from '@/types/wordpress';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

async function getMetaEntries(post: WordPressPost) {
  if (!post.sitemapUrl?.sitemapurl) return { entries: [], hasMore: false };
  
  try {
    const url = new URL(post.sitemapUrl.sitemapurl);
    if (!url.protocol.startsWith('http')) {
      throw new Error('Invalid sitemap URL protocol');
    }

    const result = await getSitemapPage(post.sitemapUrl.sitemapurl, 1);
    return {
      entries: result.entries,
      hasMore: result.hasMore
    };
  } catch (error) {
    logger.error('Failed to fetch meta entries:', error);
    return { entries: [], hasMore: false };
  }
}

export async function SitemapMetaPreviewServer({ post }: { post: WordPressPost }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const { entries: metaEntries, hasMore } = await getMetaEntries(post);
    
    // Get liked URLs if user is authenticated
    let likedUrls: string[] = [];
    if (user) {
      const likes = await prisma.metaLike.findMany({
        where: { user_id: user.id },
        select: { meta_url: true }
      });
      likedUrls = likes.map(like => like.meta_url);
    }

    const filteredEntries = metaEntries
      .filter(entry => entry.url.includes('/p/'))
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());

    return filteredEntries.length ? (
      <SitemapMetaPreview 
        initialEntries={filteredEntries}
        initialLikedUrls={likedUrls}
        initialHasMore={hasMore}
        sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
      />
    ) : null;
  } catch (error) {
    logger.error('Error in SitemapMetaPreviewServer:', error);
    return null;
  }
}

export { getMetaEntries }; 