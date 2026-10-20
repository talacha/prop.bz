import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {ImageResponse} from 'next/og'
import sharp from 'sharp'
import type {ListingType, Locale} from '@/i18n/config'
import {assetUrl} from '@/sanity/image'

// Bundled Figtree (OFL) so titles render bold; satori only ships a regular-weight default font.
const font = (w: number) => readFile(join(process.cwd(), 'src/assets/fonts', `figtree-${w}.woff`))

export const ogSize = {width: 1200, height: 630}
export const ogContentType = 'image/jpeg'

const ACCENT: Record<ListingType | 'home', string> = {home: '#0b6e66', vacation: '#0b6e66', rental: '#3f4fb0', sale: '#8a4b12'}
const GRADIENT: Record<ListingType | 'home', string> = {
  home: 'linear-gradient(135deg, #0f8f86, #0b3f55)',
  vacation: 'linear-gradient(135deg, #0f8f86, #0b3f55)',
  rental: 'linear-gradient(135deg, #5563c7, #26306e)',
  sale: 'linear-gradient(135deg, #b9702a, #5a3010)',
}

/** Cropped 1200×630 JPEG straight from Sanity's CDN (satori cannot decode AVIF/WebP). */
export const ogPhoto = (id: string) => `${assetUrl(id)}?w=1200&h=630&fit=crop&fm=jpg&q=72`

const Star = ({size}: {size: number}) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="31" fill="#f5b82e" />
    <polygon points="32,12.5 38.2,26.6 53.5,28.2 42,38.4 45.3,53.4 32,45.6 18.7,53.4 22,38.4 10.5,28.2 25.8,26.6" fill="#3a2a00" stroke="#3a2a00" strokeWidth="2.5" strokeLinejoin="round" />
  </svg>
)

type Props = {
  kind: ListingType | 'home'
  title: string
  subtitle?: string
  tag?: string
  price?: string
  photoId?: string
  /** The photo is a stand-in (this section has none yet): tint it in the section color so the card stays distinct. */
  tint?: boolean
  brand: string
  locale: Locale
}

export async function ogImage({kind, title, subtitle, tag, price, photoId, tint, brand}: Props) {
  const [f400, f700, f800] = await Promise.all([font(400), font(700), font(800)])
  const long = title.length > 34
  // next/image does not apply inside ImageResponse (satori), so a plain <img> is correct here
  // eslint-disable-next-line @next/next/no-img-element
  const photo = photoId ? <img src={ogPhoto(photoId)} alt="" width={1200} height={630} style={{position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover'}} /> : null
  return new ImageResponse(
    (
      <div style={{width: '100%', height: '100%', display: 'flex', position: 'relative', background: GRADIENT[kind], color: '#fff', fontFamily: 'Figtree'}}>
        {photo}
        {photo && tint && <div style={{position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', background: GRADIENT[kind], opacity: 0.62}} />}
        <div style={{position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', background: photoId ? 'linear-gradient(to top, rgba(6,17,24,0.96) 0%, rgba(6,17,24,0.78) 38%, rgba(6,17,24,0.25) 100%)' : 'linear-gradient(to top, rgba(6,17,24,0.45), rgba(6,17,24,0))'}} />
        <div style={{position: 'absolute', top: 44, left: 56, right: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, fontWeight: 700}}>
            <Star size={52} />
            <span>{brand}</span>
          </div>
          {tag && <div style={{display: 'flex', background: ACCENT[kind], color: '#fff', padding: '10px 22px', borderRadius: 999, fontSize: 26, fontWeight: 700}}>{tag}</div>}
        </div>
        <div style={{position: 'absolute', left: 56, right: 56, bottom: 52, display: 'flex', flexDirection: 'column', gap: 14}}>
          <div style={{display: 'flex', fontSize: long ? 60 : 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5}}>{title}</div>
          {subtitle && <div style={{display: 'flex', fontSize: 34, color: 'rgba(255,255,255,0.88)'}}>{subtitle}</div>}
          {price && <div style={{display: 'flex', fontSize: 46, fontWeight: 800, color: '#f5b82e'}}>{price}</div>}
        </div>
      </div>
    ),
    {...ogSize, fonts: [{name: 'Figtree', data: f400.buffer.slice(f400.byteOffset, f400.byteOffset + f400.byteLength) as ArrayBuffer, weight: 400, style: 'normal'}, {name: 'Figtree', data: f700.buffer.slice(f700.byteOffset, f700.byteOffset + f700.byteLength) as ArrayBuffer, weight: 700, style: 'normal'}, {name: 'Figtree', data: f800.buffer.slice(f800.byteOffset, f800.byteOffset + f800.byteLength) as ArrayBuffer, weight: 800, style: 'normal'}]},
  )
}

/** Social image as JPEG: a photo-backed PNG is about 1 MB, which chat apps (WhatsApp, iMessage) often skip. This is about 100-200 KB. */
export async function ogJpeg(props: Props): Promise<Response> {
  const png = Buffer.from(await (await ogImage(props)).arrayBuffer())
  const jpg = await sharp(png).flatten({background: '#0e2230'}).jpeg({quality: 80, mozjpeg: true}).toBuffer()
  return new Response(new Uint8Array(jpg), {headers: {'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800'}})
}
