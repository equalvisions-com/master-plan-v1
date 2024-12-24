import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    // Get the secret from URL parameters (WordPress webhook style)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Validate webhook secret
    if (secret !== process.env.WORDPRESS_WEBHOOK_SECRET) {
      console.error('Invalid webhook secret');
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    // Parse WordPress webhook payload
    const payload = await request.json();
    const postType = payload.post_type || 'post';
    const postSlug = payload.post_name || payload.slug;

    console.log('Webhook received:', { postType, postSlug });

    // Revalidate appropriate tags
    if (postType === 'post') {
      await revalidateTag(`post:${postSlug}`);
      await revalidateTag('posts');
    } else if (postType === 'category') {
      await revalidateTag(`category:${postSlug}`);
      await revalidateTag('categories');
    }

    // Always revalidate global content
    await revalidateTag('content');

    console.log('Revalidation successful:', { postType, postSlug });

    return NextResponse.json({
      revalidated: true,
      type: postType,
      slug: postSlug,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      error: 'Error processing webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Optional: Handle GET requests for testing
export async function GET(request: NextRequest) {
  return POST(request);
}
