import { logger } from '@/lib/logger';
import { getSitemapPage } from '@/lib/sitemap/sitemap-service';
import { SitemapMetaPreview } from './Client';
import type { WordPressPost } from '@/types/wordpress';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { normalizeUrl } from '@/lib/utils/normalizeUrl';
import { unstable_noStore } from 'next/cache';

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

async function getLikedUrls(userId: string) {
  unstable_noStore();
  try {
    const likes = await prisma.metaLike.findMany({
      where: { user_id: userId },
      select: { meta_url: true }
    })
    
    return likes.map(like => normalizeUrl(like.meta_url))
  } catch (error) {
    console.error('Error fetching likes:', error)
    return []
  }
}

export async function SitemapMetaPreviewServer({ post }: { post: WordPressPost }) {
  unstable_noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ entries, hasMore }, likedUrls] = await Promise.all([
    getMetaEntries(post),
    user ? getLikedUrls(user.id) : Promise.resolve([])
  ]);

  const normalizedLikedUrls = likedUrls.map(normalizeUrl);
  const likedUrlsSet = new Set(normalizedLikedUrls);

  const filteredEntries = entries
    .map(entry => ({
      ...entry,
      url: normalizeUrl(entry.url),
      isLiked: likedUrlsSet.has(normalizeUrl(entry.url))
    }));

  return <SitemapMetaPreview 
    initialEntries={filteredEntries}
    initialLikedUrls={normalizedLikedUrls}
    initialHasMore={hasMore}
    sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
  />;
}

export { getMetaEntries, getLikedUrls }; 