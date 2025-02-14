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
import type { SitemapEntry, FeedEntryType, PostsData, PostNode } from '@/app/types/feed'
import { serverQuery } from '@/lib/apollo/query'
import { gql } from '@apollo/client'

// GraphQL query for post data
const GET_POSTS_DATA = gql`
  query GetPostsData($slugs: [String!]!) {
    posts(where: { name_in: $slugs }) {
      nodes {
        slug
        title
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
      }
    }
  }
`

// Cache expensive database queries with a short TTL
const getUserBookmarks = cache(async (userId: string) => {
  const headersList = await headers()
  const requestId = headersList.get('x-request-id') || Date.now().toString()
  
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: userId },
      select: { sitemapUrl: true }
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

// Cache post data from GraphQL
const getPostsData = cache(async (slugs: string[]) => {
  const headersList = await headers()
  const requestId = headersList.get('x-request-id') || Date.now().toString()
  
  try {
    const { data } = await serverQuery<PostsData>({
      query: GET_POSTS_DATA,
      variables: { slugs },
      options: {
        fetchPolicy: 'cache-first'
      }
    })
    
    logger.info('Cache hit for posts data', { requestId, slugCount: slugs.length })
    return data?.posts?.nodes || []
  } catch (error) {
    logger.error('Error fetching posts data', { requestId, error })
    return []
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

    // Extract slugs from URLs for GraphQL query
    const slugs = sitemapUrls.map(url => {
      const match = url.match(/\/([^\/]+)\/?$/)
      return match ? match[1] : ''
    }).filter(Boolean)

    // Use Promise.all for concurrent requests
    const [feedData, likes, postsData] = await Promise.all([
      getProcessedFeedEntries(sitemapUrls, 1),
      prisma.metaLike.findMany({
        where: { user_id: user.id },
        select: { meta_url: true }
      }),
      getPostsData(slugs)
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

    // Create post data map for O(1) lookup
    const postDataMap = new Map<string, PostNode>(
      postsData.map(post => [post.slug, post])
    )

    // Fix sort type and add post data
    const entriesWithCounts = sort<FeedEntryType>(entries.map((entry: SitemapEntry) => {
      const slug = entry.url.match(/\/([^\/]+)\/?$/)?.[1] || ''
      const post = postDataMap.get(slug)
      
      return {
        ...entry,
        commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
        likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0,
        post: post ? {
          title: post.title,
          featuredImage: post.featuredImage,
          slug: post.slug
        } : undefined
      } as FeedEntryType
    })).desc(entry => new Date(entry.lastmod).getTime())

    return (
      <FeedClient
        initialEntries={entriesWithCounts}
        initialLikedUrls={likedUrls}
        initialHasMore={hasMore}
        nextCursor={nextCursor}
        userId={user.id}
        totalEntries={total}
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