/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/organization',
        permanent: false,
      },
      {
        source: '/admin/dashboard',
        destination: '/organization',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: '/organization',
        permanent: false,
      },
      {
        source: '/branch',
        destination: '/organization',
        permanent: false,
      },
      {
        source: '/branch/:path*',
        destination: '/organization',
        permanent: false,
      },
      {
        source: '/branch-admin',
        destination: '/organization',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
