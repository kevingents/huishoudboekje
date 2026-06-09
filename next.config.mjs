/** @type {import('next').NextConfig} */
const nextConfig = {
  // We use plain <img> tags with remote placeholder images so the app works
  // immediately after `npm install` without extra image-domain configuration.
  // Linting is skipped during builds so the demo never fails on cosmetic warnings.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // node-ical (en zijn deps) niet meebundelen; als extern Node-package laden.
  experimental: {
    serverComponentsExternalPackages: ['node-ical'],
  },
}

export default nextConfig
