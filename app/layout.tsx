import { ApolloProvider } from '@/app/components/providers/ApolloProvider';
import { validateGraphQLSchema } from '@/lib/apollo/schema-validation';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { config } from '@/config';
import { AppDock } from '@/app/components/AppDock';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { createClient } from '@/lib/supabase/server';
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        <ApolloProvider>
          <div className="container mx-auto px-4">
            <SidebarProvider
              style={
                {
                  "--sidebar-width": "15rem",
                  "--sidebar-collapsed-width": "4rem",
                } as React.CSSProperties
              }
            >
              <AppSidebar user={user} />
              <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b px-6">
                  <SidebarTrigger />
                  <Separator orientation="vertical" className="h-6" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </header>
                {children}
                <div className="fixed bottom-0 left-0 right-0 z-50 block md:hidden">
                  <AppDock />
                </div>
              </SidebarInset>
            </SidebarProvider>
          </div>
          <Analytics />
          <SpeedInsights />
        </ApolloProvider>
      </body>
    </html>
  );
}
