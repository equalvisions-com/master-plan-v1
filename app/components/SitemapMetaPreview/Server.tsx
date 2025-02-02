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

async function getLikedUrls(userId: string) {
  try {
    const likes = await prisma.metaLike.findMany({
      where: { user_id: userId },
      select: { meta_url: true }
    })
    
    return likes.map(like => like.meta_url)
  } catch (error) {
    console.error('Error fetching likes:', error)
    return []
  }
}

export async function SitemapMetaPreviewServer({ post }: { post: WordPressPost }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get both entries and liked URLs in parallel
  const [{ entries, hasMore }, likedUrls] = await Promise.all([
    getMetaEntries(post),
    user ? getLikedUrls(user.id) : Promise.resolve([])
  ]);

  // Create a Set for faster lookups
  const likedUrlsSet = new Set(likedUrls);

  // Filter and sort entries, and add liked state
  const filteredEntries = entries
    .filter(entry => entry.url.includes('/p/'))
    .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())
    .map(entry => ({
      ...entry,
      isLiked: likedUrlsSet.has(entry.url) // Use Set for O(1) lookups
    }));

  return filteredEntries.length ? (
    <SitemapMetaPreview 
      initialEntries={filteredEntries}
      initialLikedUrls={likedUrls}
      initialHasMore={hasMore}
      sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
    />
  ) : null;
}

export { getMetaEntries }; 