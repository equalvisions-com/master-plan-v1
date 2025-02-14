'use client'

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
import type { WordPressPost } from '@/app/types/wordpress'
import { serverQuery } from '@/lib/apollo/query'
import { gql } from '@apollo/client'

interface PostsResponse {
  posts: {
    nodes: Array<Pick<WordPressPost, 'title' | 'slug' | 'featuredImage' | 'author'>>
  }
}

// GraphQL query for post data
const GET_POSTS_BY_URLS = gql`
  query GetPostsByUrls($urls: [String!]!) {
    posts(where: { in: $urls }) {
      nodes {
        title
        slug
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        author {
          authorname
          authorurl
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

// Cache post data fetching
const getPostsData = cache(async (urls: string[]) => {
  const headersList = await headers()
  const requestId = headersList.get('x-request-id') || Date.now().toString()
  
  try {
    const { data } = await serverQuery<PostsResponse>({
      query: GET_POSTS_BY_URLS,
      variables: { urls },
      options: {
        tags: ['posts'],
        context: {
          fetchOptions: {
            next: { revalidate: 3600 }
          }
        }
      }
    })
    
    logger.info('Cache hit for posts data', { requestId, urlCount: urls.length })
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

    const bookmarks = await getUserBookmarks(user.id)

    logger.info('Found bookmarks:', { count: bookmarks.length })

    if (!bookmarks.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No bookmarked posts yet
        </div>
      )
    }

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

    const [feedData, likes, postsData] = await Promise.all([
      getProcessedFeedEntries(sitemapUrls, 1),
      prisma.metaLike.findMany({
        where: { user_id: user.id },
        select: { meta_url: true }
      }),
      getPostsData(sitemapUrls)
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

    const likedUrls = likes.map((like: { meta_url: string }) => normalizeUrl(like.meta_url))
    const urls = entries.map((entry: SitemapEntry) => normalizeUrl(entry.url))
    const [commentCounts, likeCounts] = await getMetaCounts(urls)

    // Create maps for O(1) lookup
    const commentCountMap = new Map(
      commentCounts.map(count => [normalizeUrl(count.url), count._count.id])
    )
    const likeCountMap = new Map(
      likeCounts.map(count => [normalizeUrl(count.meta_url), count._count.id])
    )
    const postsMap = new Map(
      postsData.map(post => [normalizeUrl(post.slug), post])
    )

    const entriesWithCounts = sort<FeedEntryType>(entries.map((entry: SitemapEntry) => ({
      ...entry,
      commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
      likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0,
      post: postsMap.get(normalizeUrl(entry.url)) || undefined
    } as FeedEntryType))).desc(entry => new Date(entry.lastmod).getTime())

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