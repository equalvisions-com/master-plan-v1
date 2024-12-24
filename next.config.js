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
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

module.exports = nextConfig 