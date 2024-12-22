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
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  experimental: {
    // CSS Optimization
    optimizeCss: true,
    useLightningcss: true,
    
    // Server Actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
    
    // Package Optimization
    optimizePackageImports: [
      '@mui/icons-material',
      '@mui/material',
      'date-fns',
      'lodash-es',
      'lucide-react',
      '@radix-ui/react-icons',
      '@apollo/client',
    ],
    
    // React Server Components Optimization
    optimizeServerReact: true,
    
    // Configure staleTime for dynamic routes
    staleTimes: {
      dynamic: 30, // 30 seconds for dynamic routes
      static: 180  // 3 minutes for static routes
    }
  },
  
  // Output Configuration
  output: 'standalone',
  
  // Cache Headers with new Next.js 15 recommendations
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${STALE_REVALIDATE}`
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
};

export default nextConfig;