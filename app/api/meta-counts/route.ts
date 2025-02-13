import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || Date.now().toString()
  const { searchParams } = new URL(request.url)
  const urls = searchParams.get('urls')?.split(',')

  if (!urls?.length) {
    return NextResponse.json(
      { error: 'Missing urls parameter' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get counts concurrently
    const [commentCounts, likeCounts] = await Promise.all([
      prisma.comment.groupBy({
        by: ['url'],
        _count: { id: true },
        where: { url: { in: urls.map(normalizeUrl) } }
      }),
      prisma.metaLike.groupBy({
        by: ['meta_url'],
        _count: { id: true },
        where: { meta_url: { in: urls.map(normalizeUrl) } }
      })
    ])

    // Format response
    const response = {
      comments: Object.fromEntries(
        commentCounts.map(count => [
          normalizeUrl(count.url),
          count._count.id
        ])
      ),
      likes: Object.fromEntries(
        likeCounts.map(count => [
          normalizeUrl(count.meta_url),
          count._count.id
        ])
      )
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
      }
    })
  } catch (error) {
    logger.error('Meta counts API error:', { error, requestId })
    return NextResponse.json(
      { error: 'Failed to fetch meta counts', requestId },
      { status: 500 }
    )
  }
} 