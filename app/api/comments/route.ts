import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import type { Comment } from '@/app/components/Comments/types';

export async function POST(req: Request) {
  try {
    const { content, url } = await req.json();
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const comment = {
      id: nanoid(),
      content,
      url,
      createdAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.user_metadata.full_name || user.email,
        image: user.user_metadata.avatar_url
      }
    };

    // Only store in Redis
    await redis.lpush(`comments:${url}`, JSON.stringify(comment));

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error posting comment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url).searchParams.get('url');
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const commentsData = await redis.lrange(`comments:${url}`, 0, -1);
    const comments: Comment[] = commentsData.map(comment => JSON.parse(comment));
    
    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 