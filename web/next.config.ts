import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {'/**/opengraph-image': ['./src/assets/fonts/**']}, // fonts read by the social image routes
  // Photos come from Sanity's CDN, which resizes on the fly and serves AVIF, then WebP, then JPEG by Accept header.
  images: {
    loader: 'custom',
    loaderFile: './src/sanity/imageLoader.ts',
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600],
    imageSizes: [96, 160, 256, 384],
    qualities: [60, 70, 75],
  },
  experimental: {inlineCss: true}, // tiny CSS: inline it and drop the render-blocking request
  turbopack: {
    rules: {'*.css': {loaders: ['@tailwindcss/turbopack'], as: '*.css'}},
  },
  async headers() {
    // Content-Security-Policy: scripts and styles are first-party (Next inlines small scripts, so 'unsafe-inline' is needed
    // until nonces are wired in); photos come from Sanity's CDN; nothing may frame the site or post forms elsewhere.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.sanity.io",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      // Production is HTTPS-only. Left out locally: Safari's engine would upgrade http://localhost script requests to https and break the page.
      ...(process.env.VERCEL ? ['upgrade-insecure-requests'] : []),
    ].join('; ')
    return [
      {
        source: '/:path*',
        headers: [
          {key: 'X-Content-Type-Options', value: 'nosniff'},
          {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
          {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()'},
          {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
          {key: 'Content-Security-Policy', value: csp},
          {key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains'},
          {key: 'Cross-Origin-Opener-Policy', value: 'same-origin'},
        ],
      },
      {source: '/icon-:size.png', headers: [{key: 'Cache-Control', value: 'public, max-age=31536000, immutable'}]},
    ]
  },
}

export default nextConfig
