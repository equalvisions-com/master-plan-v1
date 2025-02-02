import { logger } from '@/lib/logger';
import { getSitemapPage } from '@/lib/sitemap/sitemap-service';
import { SitemapMetaPreview } from './Client';
import type { WordPressPost } from '@/types/wordpress';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { normalizeUrl } from '@/lib/utils/normalizeUrl';
import { unstable_noStore } from 'next/cache';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Cache likes with proper revalidation
export const getLikedUrls = unstable_cache(
  async (userId: string) => {
    unstable_noStore();
    try {
      const likes = await prisma.metaLike.findMany({
        where: { user_id: userId },
        select: { meta_url: true },
        orderBy: { created_at: 'desc' }
      });
      
      return likes.map(like => normalizeUrl(like.meta_url));
    } catch (error) {
      console.error('Error fetching likes:', error);
      return [];
    }
  },
  ['meta-likes'],
  { revalidate: 1, tags: ['meta-likes'] }
);

// Cache meta entries with proper key generation
export const getMetaEntries = unstable_cache(
  async (url: string | undefined, page: number = 1) => {
    if (!url) return { entries: [], hasMore: false };
    
    try {
      const result = await getSitemapPage(url, page);
      return {
        entries: result.entries.map(entry => ({
          ...entry,
          url: normalizeUrl(entry.url)
        })),
        hasMore: result.hasMore
      };
    } catch (error) {
      logger.error('Failed to fetch meta entries:', error);
      return { entries: [], hasMore: false };
    }
  },
  ['meta-entries'],
  { revalidate: 60, tags: ['meta-entries'] }
);

export async function SitemapMetaPreviewServer({ post }: { post: WordPressPost }) {
  unstable_noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ entries, hasMore }, likedUrls] = await Promise.all([
    getMetaEntries(post.sitemapUrl?.sitemapurl || ''),
    user ? getLikedUrls(user.id) : Promise.resolve([])
  ]);

  const normalizedLikedUrls = likedUrls.map(normalizeUrl);
  const likedUrlsSet = new Set(normalizedLikedUrls);

  const filteredEntries = entries
    .filter(entry => entry.url.includes('/p/'))
    .map(entry => ({
      ...entry,
      url: normalizeUrl(entry.url),
      isLiked: likedUrlsSet.has(normalizeUrl(entry.url))
    }))
    .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());

  return <SitemapMetaPreview 
    initialEntries={filteredEntries}
    initialLikedUrls={normalizedLikedUrls}
    initialHasMore={hasMore}
    sitemapUrl={post.sitemapUrl?.sitemapurl || ''}
  />;
} 