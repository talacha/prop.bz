import {cacheLife, cacheTag} from 'next/cache'
import {client} from './client'
import {
  FEATURED_QUERY,
  PROPERTIES_QUERY,
  PROPERTY_QUERY,
  SECTIONS_NAV_QUERY,
  SECTION_QUERY,
  SETTINGS_QUERY,
  SLUGS_QUERY,
} from './queries'
import type {ListingType} from '@/i18n/config'
import type {PropertyCardData, PropertyDetail, SectionPage, SiteSettings} from './types'

// All reads are cached and tagged "sanity"; the /api/revalidate webhook invalidates the tag on publish.

export type PropertyFilters = {
  audience?: string
  minBedrooms?: number
  minGuests?: number
  pets?: boolean
  remote?: boolean
  maxBeachKm?: number
  propertyType?: string
}

export async function getProperties(type: ListingType, f: PropertyFilters = {}): Promise<PropertyCardData[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('sanity')
  return client.fetch(PROPERTIES_QUERY, {
    type,
    audience: f.audience ?? null,
    minBedrooms: f.minBedrooms ?? 0,
    minGuests: f.minGuests ?? 0,
    pets: !!f.pets,
    remote: !!f.remote,
    maxBeachKm: f.maxBeachKm ?? null,
    propertyType: f.propertyType ?? null,
  }) as Promise<PropertyCardData[]>
}

export async function getFeatured(type: ListingType): Promise<PropertyCardData[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('sanity')
  return client.fetch(FEATURED_QUERY, {type}) as Promise<PropertyCardData[]>
}

export async function getProperty(type: ListingType, slug: string): Promise<PropertyDetail | null> {
  'use cache'
  cacheLife('minutes')
  cacheTag('sanity')
  return client.fetch(PROPERTY_QUERY, {type, slug}) as Promise<PropertyDetail | null>
}

export async function getSection(type: ListingType): Promise<SectionPage | null> {
  'use cache'
  cacheLife('hours')
  cacheTag('sanity')
  return client.fetch(SECTION_QUERY, {type}) as Promise<SectionPage | null>
}

export async function getSectionsNav(): Promise<{sectionType: ListingType; navLabel: SectionPage['navLabel']; tagline: SectionPage['tagline']}[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('sanity')
  return client.fetch(SECTIONS_NAV_QUERY)
}

export async function getSettings(): Promise<SiteSettings> {
  'use cache'
  cacheLife('hours')
  cacheTag('sanity')
  return (await client.fetch(SETTINGS_QUERY)) ?? {}
}

export async function getSlugs(): Promise<{listingType: ListingType; slug: string; _updatedAt: string}[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('sanity')
  return client.fetch(SLUGS_QUERY)
}
