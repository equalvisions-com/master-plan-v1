import { Redis } from '@upstash/redis';
import { prisma } from '@/lib/prisma';
import { normalizeUrl } from '@/lib/utils/normalizeUrl';
import { unstable_cache } from 'next/cache';
import type { SitemapEntry } from '@/app/lib/sitemap/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface FeedEntry extends SitemapEntry {
  commentCount: number;
  likeCount: number;
}

interface FeedResponse {
  entries: FeedEntry[];
  cursor: string | null;
}

export const getFeedEntries = unstable_cache(
  async (userId: string, cursor?: string | null, limit: number = 10): Promise<FeedResponse> => {
    // Get user's bookmarked posts
    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: userId },
      select: { post_id: true },
      take: 50 // Limit to recent bookmarks for performance
    });

    const postIds = bookmarks.map(b => b.post_id);
    
    // Get sitemap entries from Redis for all bookmarked posts
    const sitemapKeys = postIds.map(id => `sitemap:${id}`);
    const allEntries: SitemapEntry[] = [];
    
    // Batch Redis calls for performance
    const sitemapData = await redis.mget<string[]>(...sitemapKeys);
    
    // Process sitemap entries
    sitemapData.forEach((data) => {
      if (!data) return;
      try {
        const entries = JSON.parse(data);
        allEntries.push(...entries);
      } catch (e) {
        console.error('Error parsing sitemap data:', e);
      }
    });

    // Sort by date and handle cursor pagination
    const sortedEntries = allEntries.sort((a, b) => 
      new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
    );

    let startIndex = 0;
    if (cursor) {
      startIndex = sortedEntries.findIndex(entry => entry.url === cursor) + 1;
      if (startIndex === -1) startIndex = 0;
    }

    // Get entries for current page
    const paginatedEntries = sortedEntries.slice(startIndex, startIndex + limit);

    // Get counts in batch
    const urls = paginatedEntries.map(e => normalizeUrl(e.url));
    const [commentCounts, likeCounts] = await Promise.all([
      prisma.comment.groupBy({
        by: ['url'],
        _count: { id: true },
        where: { url: { in: urls } }
      }),
      prisma.metaLike.groupBy({
        by: ['meta_url'],
        _count: { id: true },
        where: { meta_url: { in: urls } }
      })
    ]);

    // Create maps for O(1) lookup
    const commentCountMap = new Map(
      commentCounts.map(c => [normalizeUrl(c.url), c._count.id])
    );
    const likeCountMap = new Map(
      likeCounts.map(l => [normalizeUrl(l.meta_url), l._count.id])
    );

    // Combine entries with counts
    const entriesWithCounts = paginatedEntries.map(entry => ({
      ...entry,
      commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
      likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0
    }));

    return {
      entries: entriesWithCounts,
      cursor: entriesWithCounts.length === limit ? 
        entriesWithCounts[entriesWithCounts.length - 1].url : 
        null
    };
  },
  ['feed-entries'],
  { revalidate: 60 } // Cache for 1 minute
);

export const getLikedUrls = unstable_cache(
  async (userId: string): Promise<string[]> => {
    const likes = await prisma.metaLike.findMany({
      where: { user_id: userId },
      select: { meta_url: true }
    });
    return likes.map(like => normalizeUrl(like.meta_url));
  },
  ['liked-urls'],
  { revalidate: 60 }
); 