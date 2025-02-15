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
    .replace(/sitemap\.xml$/, '')
    .replace(/\/$/, '')
  
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
  
  // Parse the URL lists from the request parameters
  let processedUrls: string[] = []
  let unprocessedUrls: string[] = []
  try {
    const processedUrlsParam = searchParams.get('processedUrls')
    const unprocessedUrlsParam = searchParams.get('unprocessedUrls')
    if (processedUrlsParam) {
      processedUrls = JSON.parse(processedUrlsParam)
    }
    if (unprocessedUrlsParam) {
      unprocessedUrls = JSON.parse(unprocessedUrlsParam)
    }
  } catch (error) {
    logger.error('Error parsing URL parameters:', { error })
  }
  
  if (!page) {
    return NextResponse.json(
      { error: 'Missing page parameter' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      logger.warn('Unauthorized feed access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Add request tracking
    logger.info('Feed API: Starting request', { 
      requestId,
      page,
      userId: user.id,
      processedUrlsCount: processedUrls.length,
      unprocessedUrlsCount: unprocessedUrls.length
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
        total: 0,
        currentPage: page,
        processedUrls: [],
        unprocessedUrls: []
      })
    }

    // If we have URL lists from the client, use those
    // Otherwise, sort the URLs by processing status
    let finalProcessedUrls = processedUrls
    let finalUnprocessedUrls = unprocessedUrls
    
    if (!processedUrls.length && !unprocessedUrls.length) {
      [finalProcessedUrls, finalUnprocessedUrls] = await sortUrlsByProcessingStatus(sitemapUrls)
    }

    logger.info('Feed API: Processing sitemaps', {
      processedCount: finalProcessedUrls.length,
      unprocessedCount: finalUnprocessedUrls.length
    })

    // Process all sitemaps together to maintain chronological order
    const feedData = await getProcessedFeedEntries(finalProcessedUrls, finalUnprocessedUrls, page)
    const { entries, hasMore, total } = feedData

    // Add sitemap data to entries
    const entriesWithMeta = entries.map(entry => {
      const bookmark = bookmarks.find(b => b.sitemapUrl === entry.sourceKey)
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
      hasMore
    })

    return NextResponse.json({
      requestId,
      entries: entriesWithMeta,
      nextCursor: hasMore ? page + 1 : null,
      hasMore,
      total,
      currentPage: page,
      processedUrls: finalProcessedUrls,
      unprocessedUrls: finalUnprocessedUrls
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
      }
    })
  } catch (error) {
    logger.error('Feed API error:', { error, requestId });
    return NextResponse.json(
      { error: 'Failed to fetch feed entries', requestId },
      { status: 500 }
    );
  }
} 