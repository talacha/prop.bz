import {defineQuery} from 'next-sanity'

const PHOTO = `{ "id": asset._ref, alt, room, "hotspot": hotspot{x, y}, "lqip": asset->metadata.lqip, "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height }`

const CARD = `{
  _id, listingType, status, featured, isSample,
  "slug": slug.current,
  title, summary, propertyType, bedrooms, bathrooms, maxGuests, builtAreaM2, landAreaM2,
  beachDistanceKm, petFriendly, wifiMbps, furnished,
  "area": area->name,
  "photos": coalesce(gallery[0...1]${PHOTO}, []),
  "photoCount": count(gallery),
  "tourRooms": count(tour.scenes),
  "highlights": coalesce(amenities[amenity->highlight == true][0...4]{ "label": amenity->label, detail }, []),
  vacation{ currency, nightlyRate, cleaningFee, minNights, instantBook },
  rental{ currency, monthlyRent, depositMonths, minLeaseMonths, maxLeaseMonths, availableFrom, petsPolicy, utilitiesIncluded },
  sale{ currency, askingPrice, ownership, monthlyMaintenanceFee, incomeEstimate{ currency, monthlyRevenue, occupancyPercent } }
}`

// Structural filters live in GROQ. Money and date filters are applied in TypeScript
// because prices come in two currencies.
export const PROPERTIES_QUERY = defineQuery(`*[
  _type == "property" && listingType == $type && status != "paused" && defined(slug.current)
  && (!defined($audience) || $audience in audiences)
  && coalesce(bedrooms, 0) >= $minBedrooms
  && coalesce(maxGuests, 0) >= $minGuests
  && (!$pets || petFriendly == true || rental.petsPolicy == "allowed")
  && (!$remote || coalesce(wifiMbps, 0) >= 50)
  && (!defined($maxBeachKm) || coalesce(beachDistanceKm, 99) <= $maxBeachKm)
  && (!defined($propertyType) || propertyType == $propertyType)
  && (!$tour || count(tour.scenes) > 0)
] | order(featured desc, title.es asc) ${CARD}`)

export const TOURS_QUERY = defineQuery(`*[
  _type == "property" && status != "paused" && defined(slug.current) && count(tour.scenes) > 0
] | order(featured desc, title.es asc)[0...4] ${CARD}`)

export const FEATURED_QUERY = defineQuery(`*[
  _type == "property" && listingType == $type && status != "paused" && defined(slug.current)
] | order(featured desc, title.es asc)[0...3] ${CARD}`)

export const PROPERTY_QUERY = defineQuery(`*[
  _type == "property" && listingType == $type && slug.current == $slug && status != "paused"
][0]{
  ...${CARD},
  description,
  "gallery": coalesce(gallery[0...20]${PHOTO}, []),
  tourUrl, showExactPin, registrationNumber,
  "tour": select(count(tour.scenes) > 0 => { "start": tour.startScene, "externalUrl": tour.externalUrl, "scenes": tour.scenes[]{ id, title, "image": panorama.asset._ref, initialYaw, "links": coalesce(links[]{ to, label, yaw, pitch }, []) } }),
  "location": select(defined(location) => {"lat": location.lat, "lng": location.lng}),
  "beds": coalesce(beds[]{ type, count }, []),
  "amenities": coalesce(amenities[]{ "code": amenity->code.current, "category": amenity->category, "label": amenity->label, detail }, []),
  viewing{ enabled, modes, slotMinutes, leadTimeHours, notes },
  "agent": agent->{ name, role, whatsapp },
  vacation, rental, sale,
  seo{ title, description, noIndex }
}`)

export const SECTION_QUERY = defineQuery(`*[_type == "listingSection" && sectionType == $type][0]{
  sectionType, navLabel, title, tagline, primaryCta,
  "personas": coalesce(personas[]->{ _id, "slug": slug.current, title, tagline, preset }, [])
}`)

export const SECTIONS_NAV_QUERY = defineQuery(`*[_type == "listingSection"]{ sectionType, navLabel, tagline }`)

export const SETTINGS_QUERY = defineQuery(`*[_id == "siteSettings"][0]{
  siteName, tagline, whatsapp, email, legalEntity, defaultCurrency, estimatedTaxPercent, usdToMxn, trustPoints
}`)

export const PAGE_QUERY = defineQuery(`*[_type == "page" && slug.current == $slug][0]{ _id, title, body, _updatedAt }`)

export const PAGES_QUERY = defineQuery(`*[_type == "page" && defined(slug.current)]{ "slug": slug.current, _updatedAt }`)

export const SITEMAP_QUERY = defineQuery(`*[_type == "property" && status != "paused" && defined(slug.current) && coalesce(isSample, false) == false]{ listingType, "slug": slug.current, _updatedAt, "images": coalesce(gallery[0...5].asset._ref, []) }`)

export const SLUGS_QUERY = defineQuery(`*[_type == "property" && status != "paused" && defined(slug.current)]{ listingType, "slug": slug.current, _updatedAt }`)
