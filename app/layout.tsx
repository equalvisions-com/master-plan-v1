import { ApolloProvider } from '@/app/components/providers/ApolloProvider';
import { validateGraphQLSchema } from '@/lib/apollo/schema-validation';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { config } from '@/config';
import { AppDock } from '@/app/components/AppDock';
import "./globals.css";

const geist = Geist({ 
  subsets: ['latin'],
  display: 'swap',
});

// Validate schema in production
if (process.env.NODE_ENV === 'production') {
  validateGraphQLSchema({ throwOnError: true }).catch(console.error);
}

export async function generateMetadata(): Promise<Metadata> {
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
      'Cache-Control': `public, s-maxage=${config.cache.ttl}, stale-while-revalidate=${config.cache.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${config.cache.ttl}`,
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
          <div className="fixed bottom-0 left-0 right-0 z-50 block md:hidden">
            <AppDock />
          </div>
        </ApolloProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
