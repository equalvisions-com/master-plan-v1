import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getProcessedFeedEntries } from '@/app/lib/redis/feed'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { FeedClient } from './FeedClient'
import { unstable_noStore as noStore } from 'next/cache'
import { logger } from '@/lib/logger'
import { sort } from 'fast-sort'
import { cache } from 'react'
import { headers } from 'next/headers'
import type { SitemapEntry, FeedEntryType } from '@/app/types/feed'
import { redis } from '@/lib/redis/client'

// Helper function to get Redis keys for a sitemap URL
function getSitemapKeys(url: string) {
  // Strip protocol, www, and .com to match existing key structure
  // e.g., https://bensbites.beehiiv.com/sitemap.xml -> sitemap.bensbites
  const normalizedDomain = normalizeUrl(url)
    .replace(/^https?:\/\//, '')  // Remove protocol
    .replace(/^www\./, '')        // Remove www.
    .replace(/\.com$/, '')        // Remove .com
    .replace(/\.beehiiv$/, '')    // Remove .beehiiv
    .replace(/\/sitemap\.xml$/, '') // Remove /sitemap.xml
    .replace(/\/$/, '')           // Remove trailing slash
    .split('.')[0]                // Get first part of domain
  
  return {
    processed: `sitemap.${normalizedDomain}.processed`,
    raw: `sitemap.${normalizedDomain}.raw`
  }
}

// Cache expensive database queries with a short TTL
const getUserBookmarks = cache(async (userId: string) => {
  const headersList = await headers()
  const requestId = headersList.get('x-request-id') || Date.now().toString()
  
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: userId },
      select: { 
        sitemapUrl: true,
        title: true,
        featured_image: true
      }
    })
    
    logger.info('Cache hit for bookmarks', { requestId, userId })
    return bookmarks
  } catch (error) {
    logger.error('Error fetching bookmarks', { requestId, userId, error })
    throw error
  }
})

const getMetaCounts = cache(async (urls: string[]) => {
  const headersList = await headers()
  const requestId = headersList.get('x-request-id') || Date.now().toString()
  
  try {
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
    
    logger.info('Cache hit for meta counts', { requestId, urlCount: urls.length })
    return [commentCounts, likeCounts] as const
  } catch (error) {
    logger.error('Error fetching meta counts', { requestId, error })
    throw error
  }
})

// Add the sortUrlsByProcessingStatus function
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
    processedCount: processedUrls.length,
    unprocessedCount: unprocessedUrls.length
  })

  return [processedUrls, unprocessedUrls]
}

export async function FeedServer() {
  noStore()
  const requestId = Date.now().toString()
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Use cached database query
    const bookmarks = await getUserBookmarks(user.id)

    logger.info('Found bookmarks:', { count: bookmarks.length })

    if (!bookmarks.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No bookmarked posts yet
        </div>
      )
    }

    // Filter out any null/undefined sitemapUrls and log them
    const sitemapUrls = bookmarks
      .map(b => b.sitemapUrl)
      .filter((url): url is string => {
        if (!url) {
          logger.warn('Found bookmark with null/undefined sitemapUrl')
          return false
        }
        return true
      })

    logger.info('Fetching feed entries', { 
      sitemapCount: sitemapUrls.length,
      urls: sitemapUrls 
    })

    // Split URLs into processed and unprocessed
    const [processedUrls, unprocessedUrls] = await sortUrlsByProcessingStatus(sitemapUrls)

    // Use Promise.all for concurrent requests
    const [feedData, likes] = await Promise.all([
      getProcessedFeedEntries(processedUrls, unprocessedUrls, 1),
      prisma.metaLike.findMany({
        where: { user_id: user.id },
        select: { meta_url: true }
      })
    ])

    const { entries, nextCursor, hasMore, total } = feedData
    
    logger.info('Got feed entries', { 
      entryCount: entries.length,
      total,
      hasMore: hasMore 
    })

    if (!entries.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No entries found in bookmarked sitemaps
        </div>
      )
    }

    // Get liked URLs for initial state
    const likedUrls = likes.map((like: { meta_url: string }) => normalizeUrl(like.meta_url))

    // Get comment and like counts
    const urls = entries.map((entry: SitemapEntry) => normalizeUrl(entry.url))
    const [commentCounts, likeCounts] = await getMetaCounts(urls)

    // Create maps for O(1) lookup
    const commentCountMap = new Map(
      commentCounts.map(count => [normalizeUrl(count.url), count._count.id])
    )
    const likeCountMap = new Map(
      likeCounts.map(count => [normalizeUrl(count.meta_url), count._count.id])
    )

    // Fix sort type
    const entriesWithCounts = sort<FeedEntryType>(entries.map((entry: SitemapEntry) => {
      const bookmark = bookmarks.find(b => b.sitemapUrl === entry.sourceKey);
      return {
        ...entry,
        commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
        likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0,
        sitemap: {
          title: bookmark?.title || 'Article',
          featured_image: bookmark?.featured_image
        }
      } as FeedEntryType;
    })).desc(entry => new Date(entry.lastmod).getTime())

    return (
      <FeedClient
        initialEntries={entriesWithCounts}
        initialLikedUrls={likedUrls}
        initialHasMore={hasMore}
        nextCursor={nextCursor}
        userId={user.id}
        totalEntries={total}
        processedUrls={processedUrls}
        unprocessedUrls={unprocessedUrls}
      />
    )
  } catch (error) {
    logger.error('Error in FeedServer:', { error, requestId })
    return (
      <div className="text-center py-12 text-muted-foreground">
        Error loading feed. Please try refreshing the page.
      </div>
    )
  }
}

// Consider adding preload pattern
export const preload = (userId: string) => {
  void getUserBookmarks(userId)
} 