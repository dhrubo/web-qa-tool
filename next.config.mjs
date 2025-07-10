/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/web-qa-tool',
  assetPrefix: '/web-qa-tool/',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
