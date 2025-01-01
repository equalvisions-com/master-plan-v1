import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  try {
    const results = await unstable_cache(
      async () => {
        return await prisma.bookmark.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: 10,
          orderBy: {
            created_at: 'desc'
          },
          select: {
            id: true,
            title: true,
            sitemapUrl: true,
            created_at: true
          }
        })
      },
      [`search-${query}`],
      {
        tags: ['search', `query-${query}`],
        revalidate: 3600 // 1 hour
      }
    )()

    return NextResponse.json(results)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
} 