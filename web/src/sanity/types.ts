import type {ListingType} from '@/i18n/config'
import type {Localized, SanityPhoto} from './image'

export type Currency = 'MXN' | 'USD'

export type VacationTerms = {
  currency: Currency
  nightlyRate?: number
  weekendNightlyRate?: number
  cleaningFee?: number
  securityDeposit?: number
  minNights?: number
  maxNights?: number
  checkInTime?: string
  checkOutTime?: string
  instantBook?: boolean
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict'
}

export type RentalTerms = {
  currency: Currency
  monthlyRent?: number
  depositMonths?: number
  minLeaseMonths?: number
  maxLeaseMonths?: number
  availableFrom?: string
  utilitiesIncluded?: string[]
  petsPolicy?: 'allowed' | 'none' | 'ask'
  maintenanceFee?: number
}

export type SaleTerms = {
  currency: Currency
  askingPrice?: number
  annualPropertyTax?: number
  monthlyMaintenanceFee?: number
  ownership?: 'escritura' | 'fideicomiso' | 'other'
  yearBuilt?: number
  financing?: string[]
  incomeEstimate?: {currency: Currency; monthlyRevenue?: number; occupancyPercent?: number; basis?: Localized}
}

export type PropertyCardData = {
  _id: string
  listingType: ListingType
  status: 'available' | 'reserved' | 'closed' | 'paused'
  featured?: boolean
  isSample?: boolean
  slug: string
  title: Localized
  summary: Localized
  propertyType?: string
  bedrooms?: number
  bathrooms?: number
  maxGuests?: number
  builtAreaM2?: number
  landAreaM2?: number
  beachDistanceKm?: number
  petFriendly?: boolean
  wifiMbps?: number
  furnished?: boolean
  area?: Localized
  photos: SanityPhoto[]
  photoCount: number
  highlights?: {label: Localized; detail?: Localized}[]
  vacation?: VacationTerms
  rental?: RentalTerms
  sale?: SaleTerms
}

export type PropertyDetail = PropertyCardData & {
  description?: {es?: unknown[]; en?: unknown[]}
  gallery: SanityPhoto[]
  tourUrl?: string
  beds?: {type: string; count: number}[]
  amenities?: {code: string; category: string; label: Localized; detail?: Localized}[]
  location?: {lat: number; lng: number}
  showExactPin?: boolean
  registrationNumber?: string
  viewing?: {enabled?: boolean; modes?: string[]; slotMinutes?: number; leadTimeHours?: number; notes?: Localized}
  agent?: {name: string; role?: Localized; whatsapp?: string}
  seo?: {title?: Localized; description?: Localized; noIndex?: boolean}
}

export type Persona = {
  _id: string
  slug: string
  title: Localized
  tagline: Localized
  preset?: {
    audience?: string
    minBedrooms?: number
    minGuests?: number
    petFriendly?: boolean
    remoteWorkReady?: boolean
    maxBeachKm?: number
  }
}

export type SectionPage = {
  sectionType: ListingType
  navLabel: Localized
  title: Localized
  tagline: Localized
  primaryCta?: Localized
  personas: Persona[]
}

export type SiteSettings = {
  siteName?: string
  tagline?: Localized
  whatsapp?: string
  email?: string
  legalEntity?: string
  defaultCurrency?: Currency
  estimatedTaxPercent?: number
  usdToMxn?: number
  trustPoints?: Localized[]
}
