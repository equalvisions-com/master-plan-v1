import { NextResponse } from 'next/server'
import { toggleBookmarkAction } from '@/app/actions/bookmark'
import type { Bookmark } from '@/app/types/bookmark'

export async function POST(request: Request) {
  try {
    const bookmarkData = await request.json() as Bookmark
    const result = await toggleBookmarkAction(
      bookmarkData.postId,
      bookmarkData.title,
      bookmarkData.userId,
      bookmarkData.sitemapUrl ?? '',
      bookmarkData.isBookmarked
    )
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Bookmark API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update bookmark' }, 
      { status: 500 }
    )
  }
} 