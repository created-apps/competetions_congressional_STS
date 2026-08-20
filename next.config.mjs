/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Document parsers use Node built-ins; keep them out of the bundler.
  serverExternalPackages: ["mammoth", "unpdf"],
}

export default nextConfig
