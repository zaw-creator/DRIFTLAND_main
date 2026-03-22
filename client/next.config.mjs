/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.*.*.*'],
  reactCompiler: true,
  turbopack: {
    root: new URL('.', import.meta.url).pathname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;