import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    dirs: ['app', 'components', 'lib', 'types']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hamptoncurrent.com',
        pathname: '/wp-content/uploads/**',
        port: '',
      }
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  compress: true,
  generateEtags: true,
  staticPageGenerationTimeout: 120,
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
    tsconfigPath: './tsconfig.json',
  },
  modularizeImports: {
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
    'lodash-es': {
      transform: 'lodash-es/{{member}}',
    },
  },
  output: 'standalone',
  experimental: {
    optimizePackageImports: [
      'date-fns',
      'lodash-es'
    ],
  },
};

export default nextConfig;