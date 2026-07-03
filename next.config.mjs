/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '52mb',
    },
    // Habilita instrumentation.ts (init de Sentry en el servidor).
    instrumentationHook: true,
  },
};

export default nextConfig;
