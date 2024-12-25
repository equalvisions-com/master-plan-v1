import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Await the request body
    const body = await request.json();
    const { path, tags = [] } = body as { path?: string; tags?: string[] };

    if (path) {
      await revalidatePath(path);
    }

    if (tags.length > 0) {
      // Await all revalidations
      await Promise.all(tags.map((tag: string) => revalidateTag(tag)));
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (error) {
    logger.error('Error in revalidate route:', error);
    return NextResponse.json({ error: 'Error revalidating' }, { status: 500 });
  }
}

// Also handle GET requests for testing
export async function GET(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return POST(new Request(request.url, {
    method: 'POST',
    body: JSON.stringify(body)
  }));
} 