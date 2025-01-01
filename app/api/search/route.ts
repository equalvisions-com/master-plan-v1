import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import type { WordPressPost } from '@/types/wordpress'
import { SEARCH_CONSTANTS } from '@/lib/constants/search'
import { cacheAllPostsForSearch } from '@/lib/search/cachePosts'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

const CACHE_EXPIRATION = SEARCH_CONSTANTS.CACHE_TTL

function getScore(post: WordPressPost, searchTerm: string): number {
  let score = 0;
  
  // Title matches are weighted highest
  if (post.title?.toLowerCase().includes(searchTerm)) {
    score += 3;
  }
  
  // Excerpt matches
  if (post.excerpt?.toLowerCase().includes(searchTerm)) {
    score += 2;
  }
  
  // Category matches
  if (post.categories?.nodes.some(cat => 
    cat.name.toLowerCase().includes(searchTerm)
  )) {
    score += 1;
  }
  
  return score;
}

async function performSearch(query: string): Promise<WordPressPost[]> {
  // Get all posts from main cache using the correct cache key
  const posts = await redis.get(SEARCH_CONSTANTS.CACHE_KEY) as WordPressPost[] | null
  
  if (!posts) {
    // Try to populate cache if it's empty
    try {
      await cacheAllPostsForSearch()
      // Try getting posts again after cache population
      const refreshedPosts = await redis.get(SEARCH_CONSTANTS.CACHE_KEY) as WordPressPost[] | null
      if (!refreshedPosts) {
        throw new Error('Posts data not available')
      }
      return filterAndScorePosts(refreshedPosts, query)
    } catch (err) {
      console.error('Failed to populate search cache:', err)
      throw new Error(
        err instanceof Error ? err.message : 'Posts data not available'
      )
    }
  }

  return filterAndScorePosts(posts, query)
}

// Separate scoring logic for cleaner code
function filterAndScorePosts(posts: WordPressPost[], query: string): WordPressPost[] {
  const searchTerm = query.toLowerCase()
  return posts
    .map(post => ({
      post,
      score: getScore(post, searchTerm)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post)
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid search query' },
        { status: 400 }
      )
    }

    // Perform search directly using the cached posts
    const results = await performSearch(query)
    
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search data not available' },
      { status: 500 }
    )
  }
} 