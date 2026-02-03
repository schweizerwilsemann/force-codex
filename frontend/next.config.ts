import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  
  cacheComponents: true,
  
  sassOptions: {
    additionalData: `
      @use "sass:color";
      $primary-color: #06eebf;
      $font-stack: 'Inter', sans-serif;
    `,
    implementation: 'sass-embedded',
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.example.com' },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  reactStrictMode: true,
}

export default nextConfig

