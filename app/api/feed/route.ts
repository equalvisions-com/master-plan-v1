import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getProcessedFeedEntries } from '@/app/lib/redis/feed'
import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis/client'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'

// Helper function to get Redis keys for a sitemap URL
function getSitemapKeys(url: string) {
  // Strip protocol, www, and .com to match existing key structure
  // e.g., https://bensbites.beehiiv.com/sitemap.xml -> sitemap.bensbites
  const normalizedDomain = normalizeUrl(url)
    .replace(/^https?:\/\//, '')  // Remove protocol
    .replace(/^www\./, '')        // Remove www
    .replace(/\.com/, '')         // Remove .com
    .replace(/\.beehiiv/, '')     // Remove .beehiiv
    .replace(/\/sitemap\.xml$/, '') // Remove /sitemap.xml
    .replace(/\/$/, '')           // Remove trailing slash
  
  return {
    processed: `sitemap.${normalizedDomain}.processed`,
    raw: `sitemap.${normalizedDomain}.raw`
  }
}

// Helper function to sort URLs by processing status
async function sortUrlsByProcessingStatus(urls: string[]): Promise<[string[], string[]]> {
  const processedUrls: string[] = []
  const unprocessedUrls: string[] = []

  for (const url of urls) {
    const keys = getSitemapKeys(url)
    const isProcessed = await redis.exists(keys.processed)
    if (isProcessed) {
      processedUrls.push(url)
    } else {
      unprocessedUrls.push(url)
    }
  }

  logger.info('Sorted URLs by processing status:', {
    processedKeys: processedUrls.map(url => getSitemapKeys(url).processed),
    unprocessedKeys: unprocessedUrls.map(url => getSitemapKeys(url).processed)
  })

  return [processedUrls, unprocessedUrls]
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || Date.now().toString();
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  
  if (!page || isNaN(page) || page < 1) {
    logger.warn('Invalid page parameter', { page, requestId })
    return NextResponse.json(
      { error: 'Invalid page parameter', requestId },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      logger.warn('Unauthorized feed access attempt', { requestId })
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401 }
      )
    }

    // Add request tracking
    logger.info('Feed API: Starting request', { 
      requestId,
      page,
      userId: user.id 
    });

    // Use Promise.all for concurrent requests
    const [bookmarks] = await Promise.all([
      prisma.bookmark.findMany({
        where: { user_id: user.id },
        select: { 
          sitemapUrl: true,
          title: true,
          featured_image: true
        }
      }),
    ]);

    logger.info('Feed API: Found bookmarks', { 
      count: bookmarks.length,
      requestId 
    })

    // Filter out any null/undefined sitemapUrls
    const sitemapUrls = bookmarks
      .map(b => b.sitemapUrl)
      .filter((url): url is string => {
        if (!url) {
          logger.warn('Found bookmark with null/undefined sitemapUrl', { requestId })
          return false
        }
        return true
      })

    if (!sitemapUrls.length) {
      logger.info('Feed API: No valid sitemap URLs found', { requestId })
      return NextResponse.json({
        entries: [],
        nextCursor: null,
        hasMore: false,
        total: 0,
        currentPage: page,
        requestId
      })
    }

    logger.info('Feed API: Fetching entries', { 
      sitemapCount: sitemapUrls.length,
      page,
      requestId 
    })

    // Split URLs into processed and unprocessed
    const [processedUrls, unprocessedUrls] = await sortUrlsByProcessingStatus(sitemapUrls)

    logger.info('Feed API: Processing sitemaps', {
      processedCount: processedUrls.length,
      unprocessedCount: unprocessedUrls.length,
      requestId
    })

    // Process all sitemaps together to maintain chronological order
    const feedData = await getProcessedFeedEntries(processedUrls, unprocessedUrls, page)
    
    if (!feedData || !feedData.entries) {
      logger.error('Feed API: No feed data returned', { requestId })
      return NextResponse.json(
        { error: 'Failed to fetch feed entries', requestId },
        { status: 500 }
      )
    }
    
    const { entries, hasMore, total } = feedData

    // Add sitemap data to entries
    const entriesWithMeta = entries.map(entry => {
      const bookmark = bookmarks.find(b => b.sitemapUrl === entry.sourceKey)
      if (!bookmark) {
        logger.warn('Feed API: No bookmark found for entry', { 
          sourceKey: entry.sourceKey,
          requestId 
        })
      }
      return {
        ...entry,
        sitemap: {
          title: bookmark?.title || 'Article',
          featured_image: bookmark?.featured_image
        }
      }
    })

    logger.info('Feed API: Got entries', {
      entryCount: entriesWithMeta.length,
      total,
      hasMore,
      requestId
    })

    return NextResponse.json({
      requestId,
      entries: entriesWithMeta,
      nextCursor: hasMore ? page + 1 : null,
      hasMore,
      total,
      currentPage: page
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
      }
    })
  } catch (error) {
    logger.error('Feed API error:', { 
      error, 
      requestId,
      page,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch feed entries', requestId },
      { status: 500 }
    );
  }
} 