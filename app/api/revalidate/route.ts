import { revalidateTag } from 'next/cache';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Get the secret from the request header or query parameter
    const secret = request.headers.get('x-revalidate-token') || 
                  new URL(request.url).searchParams.get('secret');

    // Validate the secret token
    if (secret !== process.env.REVALIDATION_TOKEN) {
      return Response.json({ 
        error: 'Invalid token' 
      }, { status: 401 });
    }

    const { tags = [] } = await request.json();
    
    logger.info('Revalidating tags:', tags);
    
    await Promise.all(tags.map((tag: string) => revalidateTag(tag)));

    return Response.json({ 
      revalidated: true,
      successful: tags.length,
      failed: 0,
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