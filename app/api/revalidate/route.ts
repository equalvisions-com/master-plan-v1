import { revalidateTag } from 'next/cache';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Verify the webhook secret
    const authHeader = request.headers.get('x-webhook-secret');
    if (authHeader !== process.env.WEBHOOK_SECRET) {
      return Response.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { tags } = await request.json();
    
    logger.info('Revalidating tags:', tags);
    
    const results = await Promise.allSettled(
      tags.map(async (tag: string) => {
        try {
          await revalidateTag(tag);
          return { tag, success: true };
        } catch (error) {
          logger.error(`Failed to revalidate tag ${tag}:`, error);
          return { tag, success: false, error };
        }
      })
    );

    return Response.json({ 
      revalidated: true,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error in revalidation:', error);
    return Response.json({ 
      error: 'Error revalidating',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 