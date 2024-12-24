import { ApolloProvider } from '@/app/components/providers/ApolloProvider';
import { validateGraphQLSchema } from '@/lib/apollo/schema-validation';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { config } from '@/config';
import "./globals.css";
import { getEdgeConfig } from '@/lib/edge-config';
import type { CacheConfig } from '@vercel/edge-config';

const geist = Geist({ 
  subsets: ['latin'],
  display: 'swap',
});

// Validate schema in production
if (process.env.NODE_ENV === 'production') {
  validateGraphQLSchema({ throwOnError: true }).catch(console.error);
}

export async function generateMetadata(): Promise<Metadata> {
  const edgeCacheConfig = process.env.VERCEL_EDGE_CONFIG === 'true' 
    ? await getEdgeConfig('cache-config')
    : null;

  const cacheConfig = edgeCacheConfig as CacheConfig | null;

  return {
    title: config.site.name,
    description: config.site.description,
    metadataBase: new URL(config.site.url),
    openGraph: {
      title: config.site.name,
      description: config.site.description,
      url: config.site.url,
      siteName: config.site.name,
      type: 'website',
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      'Cache-Control': `public, s-maxage=${cacheConfig?.ttl || config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${cacheConfig?.ttl || config.cache.ttl}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${cacheConfig?.ttl || config.cache.ttl}`,
      'edge-config-cache': JSON.stringify(cacheConfig),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        <ApolloProvider>
          {children}
        </ApolloProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
