import type {MetadataRoute} from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Property Business SaaS Demo',
    short_name: 'Property Demo',
    description: 'Vacation stays, 1 to 11 month rentals and properties for sale in Playa del Carmen.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f7f6',
    theme_color: '#0b6e66',
    lang: 'es-MX',
    icons: [
      {src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
      {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
      {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
  }
}
