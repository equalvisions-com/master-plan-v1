import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis/client';
import { logger } from '@/lib/logger';
import { normalizeUrl } from '@/lib/utils/normalizeUrl';
import { getSitemapIdentifier } from '@/lib/sitemap/sitemap-service';

const ENTRIES_PER_PAGE = 10;
const FEED_CACHE_TTL = 60; // 1 minute

// Define the type for sitemap entries
interface SitemapEntry {
  url: string;
  lastmod: string;
  meta: {
    title: string;
    description: string;
    image?: string;
    platform?: string;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get cached feed for user
    const userFeedKey = `user.${user.id}.feed`;
    let entries = await redis.get<SitemapEntry[]>(userFeedKey);

    // If no cached feed, generate it
    if (!entries) {
      entries = [];
      
      // Get user's bookmarks
      const bookmarks = await prisma.bookmark.findMany({
        where: {
          user_id: user.id,
        },
        select: {
          sitemapUrl: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Fetch all sitemap entries in parallel
      const sitemapPromises = bookmarks.map(async (bookmark) => {
        if (!bookmark.sitemapUrl) return [];

        try {
          const identifier = getSitemapIdentifier(new URL(bookmark.sitemapUrl));
          const processedKey = `sitemap.${identifier}.processed`;
          return await redis.get<SitemapEntry[]>(processedKey) || [];
        } catch (error) {
          logger.error('Error fetching sitemap entries:', error);
          return [];
        }
      });

      const sitemapResults = await Promise.all(sitemapPromises);
      entries = sitemapResults.flat();

      // Sort entries by lastmod date
      entries.sort((a, b) => 
        new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
      );

      // Cache the sorted entries
      await redis.setex(userFeedKey, FEED_CACHE_TTL, entries);
    }

    // Handle cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = entries.findIndex(entry => normalizeUrl(entry.url) === cursor);
      startIndex = cursorIndex !== -1 ? cursorIndex + 1 : 0;
    }

    // Get entries for current page
    const pageEntries = entries.slice(startIndex, startIndex + ENTRIES_PER_PAGE);
    if (!pageEntries.length) {
      return NextResponse.json({
        entries: [],
        hasMore: false,
        total: entries.length,
        nextCursor: null,
      });
    }

    // Get comment and like counts in parallel
    const urls = pageEntries.map(entry => normalizeUrl(entry.url));
    const [commentCounts, likeCounts, userLikes] = await Promise.all([
      prisma.comment.groupBy({
        by: ['url'],
        _count: { id: true },
        where: { url: { in: urls } },
      }),
      prisma.metaLike.groupBy({
        by: ['meta_url'],
        _count: { id: true },
        where: { meta_url: { in: urls } },
      }),
      prisma.metaLike.findMany({
        where: {
          user_id: user.id,
          meta_url: { in: urls },
        },
        select: { meta_url: true },
      }),
    ]);

    // Create efficient lookup maps
    const commentCountMap = new Map(
      commentCounts.map(count => [count.url, count._count.id])
    );
    const likeCountMap = new Map(
      likeCounts.map(count => [count.meta_url, count._count.id])
    );
    const likedUrls = new Set(userLikes.map(like => like.meta_url));

    // Add counts and liked status to entries
    const finalEntries = pageEntries.map(entry => {
      const normalizedUrl = normalizeUrl(entry.url);
      return {
        ...entry,
        url: normalizedUrl,
        commentCount: commentCountMap.get(normalizedUrl) || 0,
        likeCount: likeCountMap.get(normalizedUrl) || 0,
        isLiked: likedUrls.has(normalizedUrl),
      };
    });

    return NextResponse.json({
      entries: finalEntries,
      hasMore: startIndex + ENTRIES_PER_PAGE < entries.length,
      total: entries.length,
      nextCursor: finalEntries[finalEntries.length - 1]?.url,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Error in feed API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 