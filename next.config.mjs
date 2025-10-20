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
  // Increase server timeout for long-running screenshot operations
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Optimize for Railway deployment
    optimizeCss: true,
    craCompat: false,
    esmExternals: true,
  },
  // Increase timeouts for long-running screenshot operations
  httpAgentOptions: {
    keepAlive: true,
  },
  // Configure proper output directory for Railway
  distDir: '.next',
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('playwright-lighthouse', 'lighthouse', 'playwright', 'playwright-core');
    }
    return config;
  },
};

export default nextConfig;