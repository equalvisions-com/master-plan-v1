import { NextResponse } from 'next/server';
import { getSitemapPage } from '@/lib/sitemap/sitemap-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Validate URL format
    new URL(url); // Throws error for invalid URLs
    
    const result = await getSitemapPage(url, page);
    return NextResponse.json({
      entries: result.entries,
      hasMore: result.hasMore,
      total: result.total,
      page: result.currentPage,
      pageSize: result.pageSize
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
      }
    });
  } catch (error) {
    console.error('Error fetching sitemap entries:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch entries',
      status: 500 
    });
  }
} 