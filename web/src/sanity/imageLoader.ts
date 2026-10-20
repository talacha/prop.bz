// next/image custom loader (configured via images.loaderFile): Sanity's CDN resizes and converts on the fly.
export default function sanityImageLoader({src, width, quality}: {src: string; width: number; quality?: number}): string {
  const url = new URL(src)
  url.searchParams.set('w', String(width))
  url.searchParams.set('q', String(quality ?? 75))
  url.searchParams.set('auto', 'format')
  // With an aspect ratio (ar) the CDN crops to it; otherwise it only caps the width
  url.searchParams.set('fit', url.searchParams.has('ar') ? 'crop' : 'max')
  return url.toString()
}
