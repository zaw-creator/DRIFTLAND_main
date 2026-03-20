/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.*.*.*'],
  reactCompiler: true,
  turbopack: {
    root: new URL('.', import.meta.url).pathname,
  },
};

export default nextConfig;