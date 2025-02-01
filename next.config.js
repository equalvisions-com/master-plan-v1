/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['app', 'components', 'lib', 'types']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    minimumCacheTTL: 3600,
    formats: ['image/avif', 'image/webp'],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  env: {
    NEXT_PUBLIC_WORDPRESS_API_URL: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
    WP_APPLICATION_USERNAME: process.env.WP_APPLICATION_USERNAME,
    WP_APPLICATION_PASSWORD: process.env.WP_APPLICATION_PASSWORD,
  },
  experimental: {
    optimizePackageImports: ['@upstash/redis'],
    // Set stale time for static content
    staleTimes: {
      static: 24 * 60 * 60, // 24 hours
    },
  },
  httpAgentOptions: {
    keepAlive: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=31536000, stale-while-revalidate=31536000'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig 