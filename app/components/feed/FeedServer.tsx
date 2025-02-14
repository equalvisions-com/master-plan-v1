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
import type { SitemapEntry, FeedEntryType, PostData } from '@/app/types/feed'
import { queries } from "@/lib/graphql/queries"
import { serverQuery } from '@/lib/apollo/query'

interface WordPressPost {
  slug: string
  featuredImage?: {
    node?: {
      sourceUrl?: string
    }
  }
}

interface WordPressResponse {
  posts?: {
    nodes?: WordPressPost[]
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
        post_id: true
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

export async function FeedServer() {
  noStore()
  const requestId = Date.now().toString()
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Start all async operations in parallel
    const [
      bookmarks,
      likes,
    ] = await Promise.all([
      getUserBookmarks(user.id),
      prisma.metaLike.findMany({
        where: { user_id: user.id },
        select: { meta_url: true }
      })
    ])

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

    // Start all heavy operations in parallel
    const [
      feedData,
      { data: wpData }
    ] = await Promise.all([
      getProcessedFeedEntries(sitemapUrls, 1),
      serverQuery<WordPressResponse>({
        query: queries.posts.getBySlugs,
        variables: { 
          slugs: bookmarks.map(b => b.post_id)
        }
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

    // Get meta counts for all entries
    const urls = entries.map((entry: SitemapEntry) => normalizeUrl(entry.url))
    const [commentCounts, likeCounts] = await getMetaCounts(urls)

    // Create all maps at once for better performance
    const [postImageMap, commentCountMap, likeCountMap] = await Promise.all([
      new Map<string, string | undefined>(
        wpData?.posts?.nodes?.map((post) => [
          post.slug,
          post.featuredImage?.node?.sourceUrl
        ]) || []
      ),
      new Map(
        commentCounts.map(count => [normalizeUrl(count.url), count._count.id])
      ),
      new Map(
        likeCounts.map(count => [normalizeUrl(count.meta_url), count._count.id])
      )
    ])

    // Create post data map with featured images
    const postDataMap = new Map<string, PostData>(
      bookmarks.map(bookmark => [
        bookmark.sitemapUrl,
        {
          title: bookmark.title,
          featuredImage: postImageMap.get(bookmark.post_id) ? {
            node: {
              sourceUrl: postImageMap.get(bookmark.post_id)!
            }
          } : undefined
        }
      ])
    )

    // Get liked URLs for initial state
    const likedUrls = likes.map((like: { meta_url: string }) => normalizeUrl(like.meta_url))

    // Create entries with counts in a single pass
    const entriesWithCounts = sort<FeedEntryType>(
      entries.map((entry: SitemapEntry) => {
        const url = normalizeUrl(entry.url)
        return {
          ...entry,
          commentCount: commentCountMap.get(url) || 0,
          likeCount: likeCountMap.get(url) || 0,
          post: postDataMap.get(entry.sourceKey) || {
            title: 'Unknown Post',
            featuredImage: undefined
          }
        }
      })
    ).desc(entry => new Date(entry.lastmod).getTime())

    return (
      <FeedClient
        initialEntries={entriesWithCounts}
        initialLikedUrls={likedUrls}
        initialHasMore={hasMore}
        nextCursor={nextCursor}
        userId={user.id}
        totalEntries={total}
        postDataMap={Object.fromEntries(postDataMap)}
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