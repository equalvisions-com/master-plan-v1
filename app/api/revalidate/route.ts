import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { config } from '@/config';

export async function POST(request: NextRequest) {
  try {
    // Check for token in both header and URL parameters
    const headerToken = request.headers.get('x-revalidate-token');
    const urlToken = new URL(request.url).searchParams.get('secret');
    const token = headerToken || urlToken;
    
    if (token !== process.env.REVALIDATION_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid token', received: token?.slice(0, 10) }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, slug } = body;

    // Handle WordPress webhook payload format
    const contentType = type || body.post_type || 'content';
    const contentSlug = slug || body.post_slug || body.slug;

    // Revalidate based on content type
    switch (contentType) {
      case 'category':
        await revalidateTag(`category:${contentSlug}`);
        await revalidateTag('categories');
        break;
      case 'post':
        await revalidateTag(`post:${contentSlug}`);
        await revalidateTag('posts');
        break;
      default:
        await revalidateTag('content');
    }

    // Log successful revalidation
    console.log(`Revalidated ${contentType}${contentSlug ? `: ${contentSlug}` : ''}`);

    return NextResponse.json({ 
      revalidated: true, 
      type: contentType,
      slug: contentSlug,
      timestamp: Date.now() 
    });
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json({ 
      error: 'Error revalidating',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also handle GET requests for testing
export async function GET(request: NextRequest) {
  return POST(request);
} 