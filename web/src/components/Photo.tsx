import Image from 'next/image'
import {assetUrl, objectPosition, type SanityPhoto} from '@/sanity/image'
import {loc} from '@/i18n/dictionary'
import type {Locale} from '@/i18n/config'

/** Sanity image through next/image with Sanity's CDN as the resizer and the LQIP as blur placeholder. */
export function Photo({photo, locale, sizes, priority, fit = 'cover', alt}: {
  photo: SanityPhoto
  locale: Locale
  sizes: string
  priority?: boolean
  fit?: 'cover' | 'contain'
  alt?: string
}) {
  return (
    <Image
      src={assetUrl(photo.id)}
      alt={alt ?? loc(photo.alt, locale)}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={photo.lqip ? 'blur' : 'empty'}
      blurDataURL={photo.lqip}
      style={{objectFit: fit, objectPosition: fit === 'cover' ? objectPosition(photo.hotspot) : undefined}}
    />
  )
}
