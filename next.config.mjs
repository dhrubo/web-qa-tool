/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'standalone',
  // basePath: '/web-qa-tool',        // Commented out for local development
  // assetPrefix: '/web-qa-tool/',    // Commented out for local development
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('playwright-lighthouse', 'lighthouse');
    }
    return config;
  },
};

export default nextConfig;