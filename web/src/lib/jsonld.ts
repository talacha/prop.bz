import type {Locale, ListingType} from '@/i18n/config'
import {propertyPath, sectionPath} from '@/i18n/config'
import {loc} from '@/i18n/dictionary'
import {assetUrl} from '@/sanity/image'
import type {PropertyCardData, PropertyDetail, SiteSettings} from '@/sanity/types'
import type {Faq} from './faq'
import {abs, PLACE} from './site'

const imgUrl = (id: string) => `${assetUrl(id)}?w=1600&fm=jpg&q=75&fit=max`

export const organizationLd = (s: SiteSettings, locale: Locale) => ({
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  '@id': abs('/#organization'),
  name: s.siteName,
  url: abs(`/${locale}`),
  logo: abs('/icon-512.png'),
  image: abs('/icon-512.png'),
  description: loc(s.tagline, locale),
  areaServed: {'@type': 'City', name: PLACE.locality, containedInPlace: {'@type': 'AdministrativeArea', name: PLACE.region}},
  address: {'@type': 'PostalAddress', addressLocality: PLACE.locality, addressRegion: PLACE.region, addressCountry: PLACE.country},
  knowsLanguage: ['es', 'en'],
  ...(s.email ? {email: s.email} : {}),
  ...(s.whatsapp ? {telephone: `+${s.whatsapp}`} : {}),
})

export const websiteLd = (s: SiteSettings, locale: Locale) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': abs('/#website'),
  name: s.siteName,
  url: abs(`/${locale}`),
  inLanguage: ['es-MX', 'en-US'],
  publisher: {'@id': abs('/#organization')},
})

export const breadcrumbLd = (items: {name: string; path: string}[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({'@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path)})),
})

export const faqLd = (faqs: Faq[]) =>
  faqs.length
    ? {'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({'@type': 'Question', name: f.q, acceptedAnswer: {'@type': 'Answer', text: f.a}}))}
    : null

export const itemListLd = (name: string, type: ListingType, locale: Locale, items: PropertyCardData[]) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name,
  url: abs(sectionPath(locale, type)),
  inLanguage: locale === 'es' ? 'es-MX' : 'en-US',
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((p, i) => ({'@type': 'ListItem', position: i + 1, url: abs(propertyPath(locale, p.listingType, p.slug)), name: loc(p.title, locale)})),
  },
})

const RESIDENCE: Record<string, string> = {apartment: 'Apartment', studio: 'Apartment', penthouse: 'Apartment', house: 'House', villa: 'House', townhouse: 'House'}

export function propertyLd(p: PropertyDetail, locale: Locale, title: string): unknown {
  const url = abs(propertyPath(locale, p.listingType, p.slug))
  const images = p.gallery?.slice(0, 12).map((g) => imgUrl(g.id))
  const description = loc(p.summary, locale)
  const amenityFeature = p.amenities?.map((a) => ({'@type': 'LocationFeatureSpecification', name: loc(a.label, locale), value: true}))
  // Public coordinates are rounded (~1 km) unless the owner enabled the exact pin.
  const geo = p.location ? (p.showExactPin ? p.location : {lat: Math.round(p.location.lat * 100) / 100, lng: Math.round(p.location.lng * 100) / 100}) : undefined
  const address = {'@type': 'PostalAddress', addressLocality: PLACE.locality, addressRegion: PLACE.region, addressCountry: PLACE.country}
  const floorSize = p.builtAreaM2 ? {'@type': 'QuantitativeValue', value: p.builtAreaM2, unitCode: 'MTK'} : undefined

  if (p.listingType === 'vacation') {
    return {
      '@context': 'https://schema.org',
      '@type': 'VacationRental',
      '@id': `${url}#vacation-rental`,
      identifier: p._id,
      name: title,
      url,
      description,
      image: images,
      brand: {'@type': 'Brand', name: 'Property Business SaaS Demo'},
      address,
      ...(geo ? {latitude: geo.lat, longitude: geo.lng} : {}),
      knowsLanguage: ['es', 'en'],
      ...(p.vacation?.checkInTime ? {checkinTime: p.vacation.checkInTime} : {}),
      ...(p.vacation?.checkOutTime ? {checkoutTime: p.vacation.checkOutTime} : {}),
      ...(p.petFriendly !== undefined ? {petsAllowed: !!p.petFriendly} : {}),
      ...(amenityFeature?.length ? {amenityFeature} : {}),
      containsPlace: {
        '@type': 'Accommodation',
        additionalType: 'EntirePlace',
        occupancy: {'@type': 'QuantitativeValue', maxValue: p.maxGuests},
        numberOfBedrooms: p.bedrooms,
        numberOfBathroomsTotal: p.bathrooms,
        ...(p.beds?.length ? {bed: p.beds.map((b) => ({'@type': 'BedDetails', numberOfBeds: b.count, typeOfBed: b.type}))} : {}),
        ...(floorSize ? {floorSize} : {}),
        ...(amenityFeature?.length ? {amenityFeature} : {}),
      },
      ...(p.vacation?.nightlyRate ? {priceRange: `${p.vacation.currency} ${p.vacation.nightlyRate}+ / night`} : {}),
    }
  }

  const offerSource = p.listingType === 'sale' ? p.sale : p.rental
  const price = p.listingType === 'sale' ? p.sale?.askingPrice : p.rental?.monthlyRent
  const offers = price
    ? {
        '@type': 'Offer',
        price,
        priceCurrency: offerSource?.currency,
        availability: p.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        url,
        ...(p.listingType === 'rental'
          ? {priceSpecification: {'@type': 'UnitPriceSpecification', price, priceCurrency: offerSource?.currency, unitCode: 'MON'}, ...(p.rental?.availableFrom ? {availabilityStarts: p.rental.availableFrom} : {})}
          : {}),
      }
    : undefined
  const about = {
    '@type': RESIDENCE[p.propertyType ?? ''] ?? 'Place',
    name: title,
    address,
    ...(geo ? {geo: {'@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng}} : {}),
    ...(p.bedrooms !== undefined && p.propertyType !== 'land' ? {numberOfBedrooms: p.bedrooms} : {}),
    ...(p.bathrooms ? {numberOfBathroomsTotal: p.bathrooms} : {}),
    ...(floorSize ? {floorSize} : {}),
    ...(p.landAreaM2 ? {lotSize: {'@type': 'QuantitativeValue', value: p.landAreaM2, unitCode: 'MTK'}} : {}),
    ...(amenityFeature?.length ? {amenityFeature} : {}),
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${url}#listing`,
    name: title,
    url,
    description,
    image: images,
    inLanguage: locale === 'es' ? 'es-MX' : 'en-US',
    about,
    ...(offers ? {offers} : {}),
  }
}
