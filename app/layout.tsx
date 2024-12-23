import { ApolloErrorBoundary } from '@/app/components/apollo/ApolloErrorBoundary';
import { validateGraphQLSchema } from '@/lib/apollo/schema-validation';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ 
  subsets: ['latin'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  if (process.env.NODE_ENV === 'production') {
    await validateGraphQLSchema({ throwOnError: true });
  }

  return {
    title: "Create Next App",
    description: "Generated by create next app",
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
        <ApolloErrorBoundary>
          {children}
        </ApolloErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
