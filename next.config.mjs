/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '52mb', // archivos principales hasta 50MB
    },
  },
};

export default nextConfig;
