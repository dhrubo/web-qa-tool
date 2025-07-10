/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
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
};

export default nextConfig;
