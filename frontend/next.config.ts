import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    cacheComponents: true, 
  },

  sassOptions: {
    additionalData: `
      @use "sass:color";
      $primary-color: #06eebf;
      $font-stack: 'Inter', sans-serif;
    `,
    implementation: 'sass-embedded',
  },

  images: {
    domains: ['images.unsplash.com', 'cdn.example.com'],
    formats: ['image/webp', 'image/avif'],
  },

  reactStrictMode: true,
  swcMinify: true,
}

export default nextConfig

