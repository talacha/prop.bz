import {defineArrayMember, defineField, defineType} from 'sanity'
import type {ConditionalPropertyCallback, CustomValidator} from 'sanity'
import {HomeIcon} from '@sanity/icons'

export const LISTING_TYPES = [
  {title: 'Vacation rental (days or weeks)', value: 'vacation'},
  {title: 'Short-term lease (1 to 11 months)', value: 'rental'},
  {title: 'For sale', value: 'sale'},
]

export const AUDIENCES = [
  {title: 'Families', value: 'families'},
  {title: 'Couples', value: 'couples'},
  {title: 'Groups of friends', value: 'groups'},
  {title: 'Remote workers', value: 'remote-workers'},
  {title: 'Relocating professionals', value: 'professionals'},
  {title: 'Students', value: 'students'},
  {title: 'Retirees / winter visitors', value: 'retirees'},
  {title: 'Second-home buyers', value: 'second-home'},
  {title: 'First-time buyers', value: 'first-home'},
  {title: 'Investors', value: 'investors'},
]

// Show a field group only for the listing types it applies to.
const hideUnless =
  (...types: string[]): ConditionalPropertyCallback =>
  ({document}) =>
    !types.includes(document?.listingType as string)

const requiredFor =
  (type: string): CustomValidator =>
  (value, ctx) =>
    ctx.document?.listingType === type && !value ? `Required for ${type} listings` : true

export const property = defineType({
  name: 'property',
  title: 'Property',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'basics', title: 'Basics', default: true},
    {name: 'media', title: 'Photos'},
    {name: 'details', title: 'Details'},
    {name: 'terms', title: 'Price & terms'},
    {name: 'location', title: 'Location'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'listingType',
      type: 'string',
      group: 'basics',
      options: {list: LISTING_TYPES, layout: 'radio'},
      validation: (r) => r.required(),
      description: 'Decides which section the property appears in and which terms apply.',
    }),
    defineField({name: 'title', type: 'localeString', group: 'basics', validation: (r) => r.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'basics',
      options: {source: 'title.es', maxLength: 80},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'status',
      type: 'string',
      group: 'basics',
      initialValue: 'available',
      options: {
        list: [
          {title: 'Available', value: 'available'},
          {title: 'Reserved / under offer', value: 'reserved'},
          {title: 'Rented / sold', value: 'closed'},
          {title: 'Paused (hidden from search)', value: 'paused'},
        ],
      },
    }),
    defineField({name: 'featured', type: 'boolean', group: 'basics', initialValue: false}),
    defineField({
      name: 'isSample',
      title: 'Sample listing',
      type: 'boolean',
      group: 'basics',
      initialValue: false,
      description: 'Demo content. The website shows a "Sample" badge. Delete these before launch.',
    }),
    defineField({
      name: 'summary',
      type: 'localeText',
      group: 'basics',
      description: 'One or two sentences for cards and search results.',
    }),
    defineField({name: 'description', type: 'localeBlock', group: 'basics'}),
    defineField({
      name: 'audiences',
      type: 'array',
      group: 'basics',
      description: 'Who this place suits best. Drives the persona filters.',
      of: [defineArrayMember({type: 'string'})],
      options: {list: AUDIENCES},
    }),

    defineField({
      name: 'gallery',
      type: 'array',
      group: 'media',
      description: 'Up to 20 photos. The first photo is the cover. Drag to reorder.',
      of: [defineArrayMember({type: 'galleryImage'})],
      validation: (r) => r.min(1).max(20),
      options: {layout: 'grid'},
    }),
    defineField({
      name: 'tourUrl',
      title: 'Video or 3D tour URL',
      type: 'url',
      group: 'media',
      validation: (r) => r.uri({scheme: ['https']}),
    }),

    defineField({
      name: 'propertyType',
      type: 'string',
      group: 'details',
      options: {
        list: ['apartment', 'studio', 'penthouse', 'house', 'villa', 'townhouse', 'land', 'commercial'],
      },
    }),
    defineField({name: 'bedrooms', type: 'number', group: 'details', validation: (r) => r.min(0).integer()}),
    defineField({name: 'bathrooms', type: 'number', group: 'details', validation: (r) => r.min(0)}),
    defineField({
      name: 'maxGuests',
      type: 'number',
      group: 'details',
      hidden: hideUnless('vacation', 'rental'),
      validation: (r) => r.min(1).integer(),
    }),
    defineField({name: 'beds', type: 'array', group: 'details', of: [defineArrayMember({type: 'bedEntry'})]}),
    defineField({name: 'builtAreaM2', title: 'Built area (m²)', type: 'number', group: 'details'}),
    defineField({name: 'landAreaM2', title: 'Land area (m²)', type: 'number', group: 'details'}),
    defineField({name: 'floor', type: 'string', group: 'details'}),
    defineField({name: 'furnished', type: 'boolean', group: 'details', initialValue: true}),
    defineField({name: 'parkingSpaces', type: 'number', group: 'details', initialValue: 0}),
    defineField({name: 'petFriendly', type: 'boolean', group: 'details', initialValue: false}),
    defineField({name: 'stepFreeAccess', type: 'boolean', group: 'details', initialValue: false}),
    defineField({
      name: 'wifiMbps',
      title: 'Wifi speed (Mbps)',
      type: 'number',
      group: 'details',
      description: 'Measured download speed. Used by the Remote worker filter.',
    }),
    defineField({name: 'dedicatedWorkspace', type: 'boolean', group: 'details', initialValue: false}),
    defineField({name: 'beachDistanceKm', title: 'Distance to the beach (km)', type: 'number', group: 'details'}),
    defineField({
      name: 'amenities',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'amenityEntry'})],
    }),

    defineField({
      name: 'vacation',
      title: 'Vacation terms',
      type: 'vacationTerms',
      group: 'terms',
      hidden: hideUnless('vacation'),
      validation: (rule) => rule.custom(requiredFor('vacation')),
    }),
    defineField({
      name: 'rental',
      title: 'Lease terms',
      type: 'rentalTerms',
      group: 'terms',
      hidden: hideUnless('rental'),
      validation: (rule) => rule.custom(requiredFor('rental')),
    }),
    defineField({
      name: 'sale',
      title: 'Sale terms',
      type: 'saleTerms',
      group: 'terms',
      hidden: hideUnless('sale'),
      validation: (rule) => rule.custom(requiredFor('sale')),
    }),
    defineField({
      name: 'viewing',
      type: 'viewingOptions',
      group: 'terms',
      hidden: hideUnless('rental', 'sale'),
    }),
    defineField({name: 'agent', type: 'reference', to: [{type: 'agent'}], group: 'terms'}),

    defineField({name: 'area', type: 'reference', to: [{type: 'area'}], group: 'location'}),
    defineField({
      name: 'address',
      type: 'string',
      group: 'location',
      description: 'Private. Only shared after a confirmed booking or scheduled viewing.',
    }),
    defineField({name: 'location', type: 'geopoint', group: 'location'}),
    defineField({
      name: 'showExactPin',
      type: 'boolean',
      group: 'location',
      initialValue: false,
      description: 'Off: the map shows an approximate area instead of the exact pin.',
    }),
    defineField({name: 'registrationNumber', title: 'Tourism registration (RNT) or permit number', type: 'string', group: 'location'}),

    defineField({name: 'seo', type: 'seo', group: 'seo'}),
  ],
  orderings: [
    {title: 'Featured first', name: 'featured', by: [{field: 'featured', direction: 'desc'}, {field: 'title.es', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'title.es', type: 'listingType', status: 'status', media: 'gallery.0'},
    prepare: ({title, type, status, media}) => ({
      title,
      subtitle: `${type ?? 'no type'} · ${status ?? ''}`,
      media,
    }),
  },
})
