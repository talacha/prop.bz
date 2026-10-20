import type {MetadataRoute} from 'next'
import {listingTypes, locales, propertyPath, sectionPath} from '@/i18n/config'
import {getSlugs} from '@/sanity/fetch'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getSlugs()
  return [
    ...locales.map((l) => ({url: `${base}/${l}`})),
    ...locales.flatMap((l) => listingTypes.map((t) => ({url: `${base}${sectionPath(l, t)}`}))),
    ...locales.flatMap((l) => slugs.map((s) => ({url: `${base}${propertyPath(l, s.listingType, s.slug)}`, lastModified: s._updatedAt}))),
  ]
}
