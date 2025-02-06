import { Redis } from '@upstash/redis'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 })
  }

  try {
    const comments = await redis.lrange(`comments:${url}`, 0, -1)
    return NextResponse.json(comments.reverse())
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content, url } = await request.json()
  
  if (!content || !url) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  const comment = {
    id: Date.now().toString(),
    content,
    url,
    author: {
      id: user.id,
      name: user.user_metadata.full_name || user.email?.split('@')[0],
      avatar: user.user_metadata.avatar_url || '',
    },
    timestamp: new Date().toISOString(),
  }

  try {
    await redis.lpush(`comments:${url}`, comment)
    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error posting comment:', error)
    return NextResponse.json(
      { error: 'Failed to post comment' },
      { status: 500 }
    )
  }
} 