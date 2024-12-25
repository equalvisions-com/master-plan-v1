import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Await the request body
    const body = await request.json();
    const { type } = body;

    // Await all revalidations
    const revalidations = [];

    if (type?.includes('post')) {
      revalidations.push(revalidateTag('posts'));
      revalidations.push(revalidateTag('homepage'));
    }
    if (type?.includes('category')) {
      revalidations.push(revalidateTag('categories'));
    }

    // Wait for all revalidations to complete
    await Promise.all(revalidations);

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (error) {
    logger.error('Error in WordPress webhook:', error);
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 });
  }
}

// Optional: Handle GET requests for testing
export async function GET(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return POST(new Request(request.url, {
    method: 'POST',
    body: JSON.stringify(body)
  }));
}
