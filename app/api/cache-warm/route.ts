import { NextRequest, NextResponse } from 'next/server';
import { cacheAllPostsForSearch } from '@/lib/search/cachePosts';

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (token !== process.env.CACHE_WARM_TOKEN) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await cacheAllPostsForSearch();
    return NextResponse.json({ success: true, message: 'Cache warmed successfully.' });
  } catch (error) {
    console.error('Cache warm-up failed:', error);
    return NextResponse.json({ success: false, message: 'Cache warm-up failed.' }, { status: 500 });
  }
} 