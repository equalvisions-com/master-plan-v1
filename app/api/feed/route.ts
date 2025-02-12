import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getProcessedSitemapEntries } from '@/app/lib/redis/feed'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'

interface Post {
  sitemap_url: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = parseInt(searchParams.get('cursor') || '0')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get bookmarked posts' sitemap keys
    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: user.id },
      select: { post_id: true }
    })

    const posts = await prisma.$queryRaw<Post[]>`
      SELECT sitemap_url
      FROM posts
      WHERE id IN (${bookmarks.map(b => b.post_id).join(',')})
    `

    const sitemapKeys = posts
      .map(post => post.sitemap_url)
      .filter((url): url is string => !!url)
      .map(url => `sitemap.${new URL(url).hostname}.processed`)

    // Get paginated entries
    const { entries, nextCursor, hasMore } = await getProcessedSitemapEntries(
      sitemapKeys,
      cursor,
      10
    )

    // Get counts for entries
    const urls = entries.map(entry => normalizeUrl(entry.url))
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

    // Create maps for O(1) lookup
    const commentCountMap = new Map(
      commentCounts.map(count => [normalizeUrl(count.url), count._count.id])
    )
    const likeCountMap = new Map(
      likeCounts.map(count => [normalizeUrl(count.meta_url), count._count.id])
    )

    // Add counts to entries
    const entriesWithCounts = entries.map(entry => ({
      ...entry,
      commentCount: commentCountMap.get(normalizeUrl(entry.url)) || 0,
      likeCount: likeCountMap.get(normalizeUrl(entry.url)) || 0
    }))

    return NextResponse.json({
      entries: entriesWithCounts,
      nextCursor,
      hasMore
    })
  } catch (error) {
    console.error('Feed API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 