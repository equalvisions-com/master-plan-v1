import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getProcessedFeedEntries } from '@/app/lib/redis/feed'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = parseInt(searchParams.get('cursor') || '0')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      logger.warn('Unauthorized feed access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all bookmarked sitemaps
    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: user.id },
      select: { sitemapUrl: true }
    })

    logger.info('Feed API: Found bookmarks', { count: bookmarks.length })

    // Filter out any null/undefined sitemapUrls
    const sitemapUrls = bookmarks
      .map(b => b.sitemapUrl)
      .filter((url): url is string => {
        if (!url) {
          logger.warn('Found bookmark with null/undefined sitemapUrl')
          return false
        }
        return true
      })

    if (!sitemapUrls.length) {
      return NextResponse.json({
        entries: [],
        nextCursor: null,
        hasMore: false,
        total: 0
      })
    }

    logger.info('Feed API: Fetching entries', { 
      sitemapCount: sitemapUrls.length,
      cursor 
    })

    // Get entries from Redis
    const { entries, nextCursor, hasMore, total } = await getProcessedFeedEntries(
      sitemapUrls,
      cursor,
      24
    )

    logger.info('Feed API: Got entries', {
      entryCount: entries.length,
      total,
      hasMore
    })

    if (!entries.length) {
      return NextResponse.json({
        entries: [],
        nextCursor: null,
        hasMore: false,
        total
      })
    }

    // Get counts for entries
    const urls = entries.map(entry => normalizeUrl(entry.url))
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
    ])

    // Create maps for O(1) lookup
    const commentCountMap = new Map(
      commentCounts.map(count => [normalizeUrl(count.url), count._count.id])
    )
    const likeCountMap = new Map(
      likeCounts.map(count => [normalizeUrl(count.meta_url), count._count.id])
    )

    // Add counts to entries
    const entriesWithCounts = entries.map(entry => ({
      ...entry,
      commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
      likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0
    }))

    return NextResponse.json({
      entries: entriesWithCounts,
      nextCursor,
      hasMore,
      total
    })
  } catch (error) {
    logger.error('Feed API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 