import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

// Initialize Upstash Redis client using environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entry = searchParams.get('entry');
  if (!entry) {
    return NextResponse.json({ error: 'Missing entry parameter' }, { status: 400 });
  }
  const key = `comments:${encodeURIComponent(entry)}`;
  try {
    const commentsRaw = await redis.lrange(key, 0, -1);
    const comments = commentsRaw.map(item => JSON.parse(item));
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments from Redis', error);
    return NextResponse.json({ error: 'Error fetching comments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entry, content } = body;
    if (!entry || !content) {
      return NextResponse.json({ error: 'Missing entry or content' }, { status: 400 });
    }
    
    // Authenticate user using Supabase Auth server side
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Build the comment object
    const comment = {
      id: Date.now(),
      author: user.email || 'Anonymous',
      content,
      timestamp: new Date().toISOString()
    };
    
    const key = `comments:${encodeURIComponent(entry)}`;
    await redis.lpush(key, JSON.stringify(comment));
    
    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error processing comment POST', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
} 