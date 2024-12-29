import { NextResponse } from 'next/server'
import { toggleBookmark } from '@/app/actions/bookmark'
import type { BookmarkInput } from '@/app/types/bookmark'

export async function POST(request: Request) {
  try {
    const bookmarkData = await request.json() as BookmarkInput
    const result = await toggleBookmark(
      bookmarkData.postId,
      bookmarkData.title,
      bookmarkData.userId,
      bookmarkData.isBookmarked,
      bookmarkData.sitemapUrl
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