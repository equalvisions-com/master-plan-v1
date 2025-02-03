import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis/client'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const sitemapKeys = await redis.keys('sitemap:*:raw');
    
    for (const rawKey of sitemapKeys) {
      const sitemapUrl = rawKey.replace('sitemap:', '').replace(':raw', '');
      
      try {
        // Validate URL
        new URL(sitemapUrl);
        
        // Fetch latest XML
        const response = await fetch(sitemapUrl);
        if (!response.ok) continue;
        
        const newRawXml = await response.text();
        await redis.set(rawKey, newRawXml);
      } catch (error) {
        console.error(`Skipping invalid sitemap: ${sitemapUrl}`, error);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to refresh sitemap:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 