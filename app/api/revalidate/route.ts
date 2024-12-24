import { revalidateTag } from 'next/cache';
import { logger } from '@/lib/logger';
import { cacheMonitor } from '@/lib/cache/monitoring';

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-revalidate-token') || 
                  new URL(request.url).searchParams.get('secret');

    if (secret !== process.env.REVALIDATION_TOKEN) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { tags = [] } = await request.json();
    const startTime = performance.now();
    
    logger.info('Revalidating tags:', tags);
    
    await Promise.all(tags.map(async (tag: string) => {
      try {
        await revalidateTag(tag);
        cacheMonitor.logRevalidate([tag], true);
      } catch (error) {
        logger.error(`Failed to revalidate tag: ${tag}`, error);
        cacheMonitor.logRevalidate([tag], false);
      }
    }));

    const duration = performance.now() - startTime;

    return Response.json({ 
      revalidated: true,
      successful: tags.length,
      failed: 0,
      duration,
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