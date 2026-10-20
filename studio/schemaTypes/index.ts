import {localeBlock, localeString, localeText} from './objects/localized'
import {seo} from './objects/seo'
import {galleryImage, tourLink, tourScene, virtualTour} from './objects/media'
import {
  amenityEntry,
  bedEntry,
  rentalIncomeEstimate,
  rentalTerms,
  saleTerms,
  seasonalRate,
  vacationTerms,
  viewingOptions,
} from './objects/terms'
import {property} from './documents/property'
import {agent, amenity, area, listingSection, page, persona, siteSettings} from './documents/supporting'

export const schemaTypes = [
  // documents
  property,
  area,
  amenity,
  persona,
  agent,
  listingSection,
  page,
  siteSettings,
  // objects
  localeString,
  localeText,
  localeBlock,
  seo,
  galleryImage,
  virtualTour,
  tourScene,
  tourLink,
  vacationTerms,
  rentalTerms,
  saleTerms,
  seasonalRate,
  rentalIncomeEstimate,
  bedEntry,
  amenityEntry,
  viewingOptions,
]
