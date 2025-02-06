import { redis } from '@/lib/redis/client';
import { NextResponse } from 'next/server';
import { createCacheKey } from '@/lib/redis/client';
import { createClient } from '@/lib/supabase/server';

export interface Comment {
  id: string;
  content: string;
  author: string;
  authorId: string;
  createdAt: string;
  url: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { content, url } = await request.json();

    if (!content?.trim() || !url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const comment: Comment = {
      id: crypto.randomUUID(),
      content: content.trim(),
      author: user.email || 'Anonymous',
      authorId: user.id,
      createdAt: new Date().toISOString(),
      url
    };

    const cacheKey = createCacheKey('comments', url);
    const existingComments = await redis.get<Comment[]>(cacheKey) || [];
    
    await redis.set(cacheKey, [...existingComments, comment]);

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error posting comment:', error);
    return NextResponse.json(
      { error: 'Failed to post comment' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const cacheKey = createCacheKey('comments', url);
    const comments = await redis.get<Comment[]>(cacheKey) || [];

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
} 