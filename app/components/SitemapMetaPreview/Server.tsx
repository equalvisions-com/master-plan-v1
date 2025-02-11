import { logger } from '@/lib/logger';
import { getSitemapPage } from '@/lib/sitemap/sitemap-service';
import { SitemapMetaPreview } from './Client';
import type { WordPressPost } from '@/types/wordpress';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { normalizeUrl } from '@/lib/utils/normalizeUrl';
import { unstable_noStore } from 'next/cache';

type PostWithPlatform = WordPressPost & {
  platform?: {
    fieldGroupName: string;
    platform: string[];
  };
};

async function getMetaEntries(post: PostWithPlatform) {
  if (!post.sitemapUrl?.sitemapurl) return { entries: [], hasMore: false, total: 0 };
  
  try {
    const url = new URL(post.sitemapUrl.sitemapurl);
    if (!url.protocol.startsWith('http')) {
      throw new Error('Invalid sitemap URL protocol');
    }

    const result = await getSitemapPage(post.sitemapUrl.sitemapurl, 1);
    const platformName = post.platform?.platform?.[0] ?? undefined;

    return {
      entries: result.entries.map(entry => ({
        ...entry,
        meta: {
          ...entry.meta,
          platform: platformName
        }
      })),
      hasMore: result.hasMore,
      total: result.total
    };
  } catch (error) {
    logger.error('Failed to fetch meta entries:', error);
    return { entries: [], hasMore: false, total: 0 };
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

export async function SitemapMetaPreviewServer({ post }: { post: PostWithPlatform }) {
  unstable_noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ entries, hasMore, total }, likedUrls] = await Promise.all([
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
    initialTotal={total}
    sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
    userId={user?.id}
    post={{
      title: post.title,
      featuredImage: post.featuredImage
    }}
  />;
}

export { getMetaEntries, getLikedUrls }; 