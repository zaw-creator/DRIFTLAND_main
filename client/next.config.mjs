/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  turbopack: {
    root: new URL('.', import.meta.url).pathname,
  },
};

export default nextConfig;