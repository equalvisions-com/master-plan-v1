import { ApolloProvider } from '@/app/components/providers/ApolloProvider';
import { validateGraphQLSchema } from '@/lib/apollo/schema-validation';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { config } from '@/config';
import { AppDock } from '@/app/components/AppDock';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from '@/lib/supabase/server';
import "./globals.css";
import { cn } from "@/lib/utils";
import { TopNav } from "@/app/components/TopNav";
import { Toaster } from "@/components/ui/toaster";

const geist = Geist({ 
  subsets: ['latin'],
  display: 'swap',
});

// Validate schema in production
if (process.env.NODE_ENV === 'production') {
  validateGraphQLSchema({ throwOnError: true }).catch(console.error);
}

export async function generateMetadata(): Promise<Metadata> {
  // Get site URL with fallbacks
  const siteUrl = config.site.url || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'https://hamptoncurrent.com';
  
  // Ensure URL has protocol
  const baseUrl = siteUrl.startsWith('http') 
    ? siteUrl 
    : `https://${siteUrl}`;

  return {
    title: config.site.name,
    description: config.site.description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: config.site.name,
      description: config.site.description,
      url: baseUrl,
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={cn(
        geist.className,
        "antialiased min-h-screen bg-background flex flex-col overflow-hidden",
      )}>
        <ApolloProvider>
          <SidebarProvider defaultOpen={false}>
            <div className="fixed top-0 left-0 right-0 z-50">
              <TopNav user={user} />
            </div>

            <div className="flex flex-1 pt-[var(--header-height)]">
              <div className="group/sidebar-wrapper flex has-[[data-variant=floating]]:bg-sidebar px-[var(--page-padding)] w-full">
                <AppSidebar/>
                <SidebarInset 
                  className="flex-1 pl-[var(--content-spacing)]"
                  data-variant="floating"
                >
                  <main className="h-[calc(100vh-var(--header-height))] w-full py-[var(--content-spacing)]">
                    <div className="container-fluid h-full">
                      {children}
                    </div>
                  </main>
                </SidebarInset>
              </div>
            </div>
          </SidebarProvider>
        </ApolloProvider>
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <AppDock user={user} />
        </div>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
