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
  // Only exclude screenshots from build traces, not node_modules
  experimental: {
    outputFileTracingIgnores: [
      'public/screenshots/**/*',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('playwright-lighthouse', 'lighthouse', 'playwright', 'playwright-core');
    }
    return config;
  },
};

export default nextConfig;