import { revalidateTag } from 'next/cache';
import { verifySignature } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-webhook-signature') || '';
    
    // Verify webhook signature with all required arguments
    if (!verifySignature(
      signature,
      JSON.stringify(body),
      process.env.WEBHOOK_SECRET || ''
    )) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { postId } = body;
    
    // Revalidate specific tags based on content type
    await Promise.all([
      revalidateTag(`post:${postId}`),
      revalidateTag('posts'),
      revalidateTag('content')
    ]);

    return Response.json({
      revalidated: true,
      now: Date.now(),
      cache: 'purged'
    });
  } catch (error) {
    return Response.json({
      error: 'Error revalidating',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
