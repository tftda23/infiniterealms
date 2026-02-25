/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
      },
    ],
  },
  // Force clean builds in global environments
  webpack: (config, { dev, isServer }) => {
    config.cache = false;
    return config;
  },
};

module.exports = nextConfig;
