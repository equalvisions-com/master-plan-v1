import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import type { WordPressPost } from '@/types/wordpress'
import { serverQuery } from '@/lib/apollo/query'
import { queries } from '@/lib/graphql/queries'
import { SEARCH_CONSTANTS } from '@/lib/constants/search'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

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

async function getAllPosts(): Promise<WordPressPost[]> {
  // Try to get posts from Redis first
  const cachedPosts = await redis.get<WordPressPost[]>(SEARCH_CONSTANTS.CACHE_KEY)
  if (cachedPosts) return cachedPosts

  // If not in cache, fetch from WordPress and cache for 24 hours
  const { data } = await serverQuery<{ posts: { nodes: WordPressPost[] } }>({
    query: queries.posts.getAllForSearch,
    variables: {},
    options: {
      tags: ['posts', 'search']
    }
  })

  if (!data?.posts?.nodes) {
    throw new Error('Posts data not available')
  }

  // Cache the posts for 24 hours
  await redis.set(
    SEARCH_CONSTANTS.CACHE_KEY, 
    data.posts.nodes,
    { ex: SEARCH_CONSTANTS.CACHE_TTL }
  )

  return data.posts.nodes
}

async function performSearch(query: string): Promise<WordPressPost[]> {
  const posts = await getAllPosts()
  return filterAndScorePosts(posts, query)
}

function filterAndScorePosts(posts: WordPressPost[], query: string): WordPressPost[] {
  const searchTerm = query.toLowerCase()
  return posts
    .map(post => ({
      post,
      score: getScore(post, searchTerm)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, SEARCH_CONSTANTS.MAX_RESULTS)
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

    // Search through cached posts
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