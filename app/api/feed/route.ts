import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getProcessedFeedEntries } from '@/app/lib/redis/feed'
import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis/client'

const BATCH_SIZE = 10 // Adjust based on API limits
const MAX_CONCURRENT_REQUESTS = 5 // Adjust based on server capacity

async function processBatch(urls: string[]) {
  try {
    // Process URLs in smaller batches to avoid overwhelming the API
    const batches = urls.reduce((acc, url, i) => {
      const batchIndex = Math.floor(i / BATCH_SIZE)
      if (!acc[batchIndex]) acc[batchIndex] = []
      acc[batchIndex].push(url)
      return acc
    }, [] as string[][])

    // Process batches with controlled concurrency
    const results = []
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT_REQUESTS) {
      const batchPromises = batches
        .slice(i, i + MAX_CONCURRENT_REQUESTS)
        .map(batch => getProcessedFeedEntries(batch, 24))
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Add small delay between batch processing to prevent rate limiting
      if (i + MAX_CONCURRENT_REQUESTS < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  } catch (error) {
    logger.error('Error processing batches:', error)
    throw error
  }
}

// Helper function to sort URLs by processing status
async function sortUrlsByProcessingStatus(urls: string[]): Promise<[string[], string[]]> {
  const processedUrls: string[] = []
  const unprocessedUrls: string[] = []

  for (const url of urls) {
    const key = `processed:${url}`
    const isProcessed = await redis.exists(key)
    if (isProcessed) {
      processedUrls.push(url)
    } else {
      unprocessedUrls.push(url)
    }
  }

  return [processedUrls, unprocessedUrls]
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || Date.now().toString();
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  
  if (!cursor) {
    return NextResponse.json(
      { error: 'Missing cursor parameter' },
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
      cursor,
      userId: user.id 
    });

    // Use Promise.all for concurrent requests
    const [bookmarks] = await Promise.all([
      prisma.bookmark.findMany({
        where: { user_id: user.id },
        select: { sitemapUrl: true }
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
        total: 0
      })
    }

    logger.info('Feed API: Fetching entries', { 
      sitemapCount: sitemapUrls.length,
      cursor 
    })

    // Split URLs into processed and unprocessed
    const [processedUrls, unprocessedUrls] = await sortUrlsByProcessingStatus(sitemapUrls)

    // Process in parallel with controlled batching
    const [processedResults, unprocessedResults] = await Promise.all([
      getProcessedFeedEntries(processedUrls, 24),
      processBatch(unprocessedUrls)
    ])

    // Merge and sort results
    const mergedEntries = [...processedResults.entries, ...unprocessedResults.flatMap(r => r.entries)]
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

    logger.info('Feed API: Got entries', {
      entryCount: mergedEntries.length,
      total: processedResults.total + unprocessedResults.reduce((sum, r) => sum + r.total, 0),
      hasMore: mergedEntries.length >= 24
    })

    return NextResponse.json({
      requestId,
      entries: mergedEntries,
      nextCursor: processedResults.nextCursor,
      hasMore: mergedEntries.length >= 24,
      total: processedResults.total + unprocessedResults.reduce((sum, r) => sum + r.total, 0)
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