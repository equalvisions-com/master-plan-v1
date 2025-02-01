import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { SitemapEntry } from '@/lib/sitemap/types'
import { fetchMetaTags } from '@/lib/sitemap/utils'
import { XMLParser } from 'fast-xml-parser'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export async function GET() {
  try {
    // Get all sitemap keys
    const sitemapKeys = await redis.keys('sitemap:*');
    
    for (const key of sitemapKeys) {
      const existing = await redis.get<SitemapEntry[]>(key) || [];
      const sitemapUrl = key.replace('sitemap:', '');
      
      try {
        const response: unknown = await fetch(sitemapUrl);
        const xml = await response.text();

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '',
          parseAttributeValue: true
        });

        const parsed = parser.parse(xml);
        const urls = [];

        if (parsed.urlset?.url) {
          urls.push(...parsed.urlset.url.map((entry: unknown) => {
            const e = entry as { loc?: string };
            return e.loc?.trim();
          }));
        } else if (parsed.sitemapindex?.sitemap) {
          urls.push(...parsed.sitemapindex.sitemap.map((entry: unknown) => {
            const e = entry as { loc?: string };
            return e.loc?.trim();
          }));
        }

        const validUrls = urls.filter(Boolean);

        const newUrls = validUrls.filter(url => 
          !existing.some(entry => entry.url === url)
        );

        const newEntries = (await Promise.all(
          newUrls.map(async url => {
            const meta = await fetchMetaTags(url);
            return meta ? {
              url,
              lastmod: new Date().toISOString(),
              meta
            } : null;
          })
        )).filter(Boolean) as SitemapEntry[];

        if (newEntries.length > 0) {
          await redis.set(key, [...newEntries, ...existing]);
        }
      } catch {
        console.error('Error occurred in refresh-sitemap route:');
      }
    }
    
    return NextResponse.json({ success: true, updated: sitemapKeys.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Sitemap refresh failed' },
      { status: 500 }
    );
  }
} 