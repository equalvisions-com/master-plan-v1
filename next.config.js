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
        hostname: 'hamptoncurrent.com',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
    ],
    domains: ['hamptoncurrent.com'],
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
  }
};

module.exports = nextConfig 