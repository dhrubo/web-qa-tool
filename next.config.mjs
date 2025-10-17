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
  // Exclude screenshots and heavy dependencies from build traces
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'public/screenshots/**/*',
        'node_modules/playwright-core/**/*',
        'node_modules/playwright/**/*',
        'node_modules/@playwright/**/*',
        'node_modules/lighthouse/**/*',
        'node_modules/chrome-launcher/**/*',
      ],
    },
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