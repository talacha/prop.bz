import {dataset, projectId} from './env'

export type SanityPhoto = {
  id: string // asset _ref, e.g. image-abc123-4000x3000-jpg
  alt?: Localized
  lqip?: string
  w?: number
  h?: number
  hotspot?: {x: number; y: number} | null
  room?: string
}

export type Localized = {es?: string; en?: string} | null | undefined

/** Base CDN URL for an image asset reference. */
export function assetUrl(ref: string): string {
  const [, id, dims, ext] = ref.split('-')
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dims}.${ext}`
}

export function objectPosition(h?: {x: number; y: number} | null): string | undefined {
  return h ? `${Math.round(h.x * 100)}% ${Math.round(h.y * 100)}%` : undefined
}
