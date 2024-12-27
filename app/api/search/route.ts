import { NextRequest, NextResponse } from 'next/server';
import { cacheAllPostsForSearch } from '@/lib/search/cachePosts';
import Fuse from 'fuse.js';
import { redis } from '@/lib/redis/client';
import type { WordPressPost } from '@/types/wordpress';

/**
 * Handler for POST requests to perform search.
 */
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        results: [],
        error: 'Query must be at least 2 characters' 
      }, { status: 400 });
    }

    // Ensure posts are cached
    await cacheAllPostsForSearch();

    // Retrieve cached posts from Redis
    const posts = await redis.get<WordPressPost[]>('all_posts_for_search');
    if (!posts || !Array.isArray(posts)) {
      throw new Error('No valid cached posts found.');
    }

    // Configure Fuse.js options
    const fuseOptions = {
      keys: ['title', 'excerpt', 'content'],
      threshold: 0.3,
      includeMatches: true,
      minMatchCharLength: 2
    };

    // Initialize Fuse.js with the posts data
    const fuse = new Fuse(posts, fuseOptions);

    // Perform the search
    const searchResults = fuse.search(query);
    const results = searchResults.map(result => result.item);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 