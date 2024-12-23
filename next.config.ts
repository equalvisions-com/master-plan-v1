import type { NextConfig } from 'next';
import type { ImageLoaderProps } from 'next/image';

// Define types for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      WORDPRESS_URL_HOSTNAME?: string;
      REVALIDATION_TOKEN?: string;
    }
  }
}

// Import config or define cache values directly
const CACHE_TTL = 60 * 60; // 1 hour in seconds
const STALE_REVALIDATE = 60 * 5; // 5 minutes in seconds

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.WORDPRESS_URL_HOSTNAME || 'hamptoncurrent.com',
        pathname: '/**',
      }
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Cache Headers with new Next.js 15 recommendations
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, s-maxage=3600, stale-while-revalidate=59'
        },
        {
          key: 'CDN-Cache-Control',
          value: 'public, max-age=3600'
        },
        {
          key: 'Vercel-CDN-Cache-Control',
          value: 'public, max-age=3600'
        }
      ],
    }
  ],
  
  // Security & Performance
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Static Asset Optimization
  compress: true,
  generateEtags: true,
  staticPageGenerationTimeout: 120,
  
  // TypeScript Configuration
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
    tsconfigPath: './tsconfig.json',
  },
  
  // Module Resolution
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
    'lodash-es': {
      transform: 'lodash-es/{{member}}',
    },
  },
  
  // Static Generation and Experimental Features
  output: 'standalone',
  experimental: {
    optimizePackageImports: [
      '@mui/icons-material',
      'date-fns',
      'lodash-es'
    ],
  },
};

export default nextConfig;