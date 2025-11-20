import type { NextConfig } from 'next';
require('dotenv').config({ path: './.env' });

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  sw: 'sw.js',
});

const nextConfig: NextConfig = {
  // ВАЖЛИВО: увімкнути webpack у Next.js 16
  webpack: (config) => {
    return config;
  },

  // Заглушка для Turbopack: прибирає помилку
  turbopack: {},

  // Інші налаштування
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
