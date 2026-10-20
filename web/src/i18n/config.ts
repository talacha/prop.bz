export const locales = ['es', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'es'

export type ListingType = 'vacation' | 'rental' | 'sale'
export const listingTypes: ListingType[] = ['vacation', 'rental', 'sale']

// Section URLs are localized: /es/estancias, /en/stays ...
export const sectionSlugs: Record<ListingType, Record<Locale, string>> = {
  vacation: {es: 'estancias', en: 'stays'},
  rental: {es: 'rentas', en: 'rentals'},
  sale: {es: 'venta', en: 'sale'},
}

export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v)

export function sectionFromSlug(locale: Locale, slug: string): ListingType | undefined {
  return listingTypes.find((t) => sectionSlugs[t][locale] === slug)
}

export const sectionPath = (locale: Locale, type: ListingType) => `/${locale}/${sectionSlugs[type][locale]}`
export const propertyPath = (locale: Locale, type: ListingType, slug: string) =>
  `${sectionPath(locale, type)}/${slug}`
