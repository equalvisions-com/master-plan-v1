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
    // Get likes from both Prisma and Supabase to ensure consistency
    const [prismaLikes, supabaseLikes] = await Promise.all([
      prisma.metaLike.findMany({
        where: { user_id: userId },
        select: { meta_url: true }
      }),
      (await createClient())
        .from('meta_likes')
        .select('meta_url')
        .eq('user_id', userId)
    ]);

    // Combine and deduplicate likes
    const allLikes = new Set([
      ...prismaLikes.map(like => like.meta_url),
      ...(supabaseLikes.data?.map(like => like.meta_url) || [])
    ]);

    return Array.from(allLikes);
  } catch (error) {
    console.error('Error fetching likes:', error);
    return [];
  }
}

export async function SitemapMetaPreviewServer({ post }: { post: WordPressPost }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ entries, hasMore }, likedUrls] = await Promise.all([
    getMetaEntries(post),
    user ? getLikedUrls(user.id) : Promise.resolve([])
  ]);

  // Filter and sort entries
  const filteredEntries = entries
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
}

export { getMetaEntries }; 