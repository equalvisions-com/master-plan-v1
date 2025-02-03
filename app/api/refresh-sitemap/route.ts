import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis/client'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const sitemapKeys = await redis.keys('sitemap:*:raw');
    
    for (const rawKey of sitemapKeys) {
      // Extract URL properly from Redis key
      const sitemapUrl = rawKey.split(':').slice(1, -1).join(':');
      
      try {
        // Attempt to construct a valid URL
        const validatedUrl = new URL(sitemapUrl);

        // Ensure protocol and hostname are valid
        if (
          !['http:', 'https:'].includes(validatedUrl.protocol) ||
          !validatedUrl.hostname.includes('.') ||
          validatedUrl.hostname.toLowerCase() === 'https'
        ) {
          logger.warn('Skipping invalid sitemap URL:', { sitemapUrl });
          continue;
        }

        logger.info('Refreshing sitemap:', { url: validatedUrl.toString() });
        
        // Fetch latest XML
        const response = await fetch(validatedUrl.toString());
        if (!response.ok) {
          logger.error('Failed to fetch sitemap:', { 
            url: validatedUrl.toString(), 
            status: response.status 
          });
          continue;
        }
        
        const newRawXml = await response.text();
        await redis.setex(rawKey, 86400, newRawXml); // 24h TTL
        
        logger.info('Successfully refreshed sitemap:', { 
          url: validatedUrl.toString() 
        });
      } catch (error) {
        logger.error('Error processing sitemap:', { 
          sitemapUrl, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to refresh sitemaps:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 