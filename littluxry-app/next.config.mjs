/** @type {import('next').NextConfig} */
const nextConfig = {
  // Runtime uploads land in public/assets/uploads but next start won't serve
  // files that appear after boot — rewrite to the API file handler instead.
  async rewrites() {
    return [
      {
        source: '/assets/uploads/:name',
        destination: '/api/shop-media/:name',
      },
    ]
  },
}

export default nextConfig
