import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis/client';
import { logger } from '@/lib/logger';
import { normalizeUrl } from '@/lib/utils/normalizeUrl';
import { getSitemapIdentifier } from '@/lib/sitemap/sitemap-service';

const ENTRIES_PER_PAGE = 10;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const cursor = searchParams.get('cursor');

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Get entries from Redis for all bookmarked sitemaps
    const entries: Array<{
      url: string;
      lastmod: string;
      meta: {
        title: string;
        description: string;
        image?: string;
        platform?: string;
      };
    }> = [];

    for (const bookmark of bookmarks) {
      if (!bookmark.sitemapUrl) continue;

      try {
        const identifier = getSitemapIdentifier(new URL(bookmark.sitemapUrl));
        const processedKey = `sitemap.${identifier}.processed`;
        const sitemapEntries = await redis.get<{
          url: string;
          lastmod: string;
          meta: {
            title: string;
            description: string;
            image?: string;
            platform?: string;
          };
        }[]>(processedKey);

        if (sitemapEntries?.length) {
          entries.push(...sitemapEntries);
        }
      } catch (error) {
        logger.error('Error fetching sitemap entries:', error);
        continue;
      }
    }

    // Sort all entries by lastmod date
    entries.sort((a, b) => 
      new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime()
    );

    // Handle cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      startIndex = entries.findIndex(entry => normalizeUrl(entry.url) === cursor) + 1;
      if (startIndex === 0) {
        startIndex = (page - 1) * ENTRIES_PER_PAGE;
      }
    } else {
      startIndex = (page - 1) * ENTRIES_PER_PAGE;
    }

    // Get entries for current page
    const pageEntries = entries.slice(startIndex, startIndex + ENTRIES_PER_PAGE);

    // Get comment and like counts for the entries
    const urls = pageEntries.map(entry => normalizeUrl(entry.url));
    const [commentCounts, likeCounts] = await Promise.all([
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
    ]);

    // Create maps for O(1) lookup
    const commentCountMap = new Map(
      commentCounts.map(count => [count.url, count._count.id])
    );
    const likeCountMap = new Map(
      likeCounts.map(count => [count.meta_url, count._count.id])
    );

    // Add counts to entries
    const entriesWithCounts = pageEntries.map(entry => ({
      ...entry,
      url: normalizeUrl(entry.url),
      commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
      likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0,
    }));

    // Get user's liked entries
    const userLikes = await prisma.metaLike.findMany({
      where: {
        user_id: user.id,
        meta_url: { in: urls },
      },
      select: { meta_url: true },
    });

    const likedUrls = new Set(userLikes.map(like => like.meta_url));

    // Add isLiked to entries
    const finalEntries = entriesWithCounts.map(entry => ({
      ...entry,
      isLiked: likedUrls.has(entry.url),
    }));

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