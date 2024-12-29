import { NextResponse } from 'next/server';
import { getFromCache } from '@/lib/redis/client';
import { logger } from '@/lib/logger';
import type { WordPressPost } from '@/types/wordpress';
import { SEARCH_CONSTANTS } from '@/lib/constants/search';

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

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid search query' },
        { status: 400 }
      );
    }

    // Get posts from Redis cache with type safety
    const posts = await getFromCache<WordPressPost[]>(SEARCH_CONSTANTS.CACHE_KEY);
    
    if (!posts) {
      return NextResponse.json(
        { error: 'Search data not available' },
        { status: 503 }
      );
    }

    // Perform search with scoring
    const searchTerm = query.toLowerCase();
    const results = posts
      .map(post => ({
        post,
        score: getScore(post, searchTerm)
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, SEARCH_CONSTANTS.MAX_RESULTS)
      .map(({ post }) => post);

    return NextResponse.json({ results });
  } catch (error) {
    logger.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
} 