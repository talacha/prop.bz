// next/image custom loader (configured via images.loaderFile): Sanity's CDN resizes and converts on the fly.
export default function sanityImageLoader({src, width, quality}: {src: string; width: number; quality?: number}): string {
  const url = new URL(src)
  url.searchParams.set('w', String(width))
  url.searchParams.set('q', String(quality ?? 75))
  url.searchParams.set('auto', 'format')
  url.searchParams.set('fit', 'max')
  return url.toString()
}
