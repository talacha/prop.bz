import Image from 'next/image'
import {assetUrl, objectPosition, type SanityPhoto} from '@/sanity/image'
import {loc} from '@/i18n/dictionary'
import type {Locale} from '@/i18n/config'

/** Sanity image through next/image with Sanity's CDN as the resizer and the LQIP as blur placeholder. */
export function Photo({photo, locale, sizes, priority, fit = 'cover', alt, quality = 70, ratio}: {
  photo: SanityPhoto
  locale: Locale
  sizes: string
  priority?: boolean
  fit?: 'cover' | 'contain'
  alt?: string
  quality?: number
  /** Crop on the CDN to this shape ("4:3"), around the photo's focal point, so no unseen pixels are downloaded. */
  ratio?: string
}) {
  const focus = photo.hotspot ? `&crop=focalpoint&fp-x=${photo.hotspot.x.toFixed(3)}&fp-y=${photo.hotspot.y.toFixed(3)}` : ''
  const src = assetUrl(photo.id) + (ratio ? `?ar=${ratio}${focus}` : '')
  return (
    <Image
      src={src}
      alt={alt ?? loc(photo.alt, locale)}
      fill
      sizes={sizes}
      preload={priority}
      fetchPriority={priority ? 'high' : 'auto'}
      quality={quality}
      placeholder={photo.lqip ? 'blur' : 'empty'}
      blurDataURL={photo.lqip}
      style={{objectFit: fit, objectPosition: fit === 'cover' ? objectPosition(photo.hotspot) : undefined}}
    />
  )
}
