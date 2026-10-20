import {defineArrayMember, defineField, defineType} from 'sanity'
import {PinIcon, TagIcon, UsersIcon, UserIcon, CogIcon, DocumentIcon, ThLargeIcon} from '@sanity/icons'
import {AUDIENCES, LISTING_TYPES} from './property'

export const area = defineType({
  name: 'area',
  title: 'Area',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({name: 'name', type: 'localeString', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name.es'}, validation: (r) => r.required()}),
    defineField({name: 'description', type: 'localeText'}),
    defineField({name: 'location', type: 'geopoint'}),
    defineField({name: 'image', type: 'image', options: {hotspot: true}}),
  ],
  preview: {select: {title: 'name.es', media: 'image'}},
})

export const amenity = defineType({
  name: 'amenity',
  title: 'Amenity',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({name: 'label', type: 'localeString', validation: (r) => r.required()}),
    defineField({
      name: 'code',
      type: 'slug',
      options: {source: 'label.en'},
      validation: (r) => r.required(),
      description: 'Stable key used by filters and the booking API, e.g. "pool", "wifi".',
    }),
    defineField({
      name: 'category',
      type: 'string',
      options: {
        list: ['essentials', 'kitchen', 'wellness', 'outdoor', 'work', 'access', 'safety', 'building'],
      },
      validation: (r) => r.required(),
    }),
    defineField({name: 'highlight', type: 'boolean', initialValue: false, description: 'Show as a chip on cards.'}),
  ],
  preview: {select: {title: 'label.es', subtitle: 'category'}},
})

export const persona = defineType({
  name: 'persona',
  title: 'Persona (search shortcut)',
  type: 'document',
  icon: UsersIcon,
  description: 'A "Find my place" shortcut that applies a filter preset in one or more sections.',
  fields: [
    defineField({name: 'title', type: 'localeString', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title.en'}, validation: (r) => r.required()}),
    defineField({name: 'tagline', type: 'localeString'}),
    defineField({
      name: 'appliesTo',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {list: LISTING_TYPES},
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'preset',
      type: 'object',
      description: 'Filters applied when a visitor picks this persona.',
      fields: [
        defineField({name: 'audience', type: 'string', options: {list: AUDIENCES}}),
        defineField({name: 'minBedrooms', type: 'number'}),
        defineField({name: 'minGuests', type: 'number'}),
        defineField({name: 'petFriendly', type: 'boolean'}),
        defineField({name: 'remoteWorkReady', type: 'boolean'}),
        defineField({name: 'maxBeachKm', type: 'number'}),
        defineField({name: 'requireAmenities', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'amenity'}]})]}),
      ],
    }),
    defineField({name: 'order', type: 'number', initialValue: 100}),
  ],
  orderings: [{title: 'Order', name: 'order', by: [{field: 'order', direction: 'asc'}]}],
  preview: {select: {title: 'title.es', subtitle: 'tagline.es'}},
})

export const agent = defineType({
  name: 'agent',
  title: 'Contact / agent',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'role', type: 'localeString'}),
    defineField({name: 'photo', type: 'image', options: {hotspot: true}}),
    defineField({name: 'whatsapp', type: 'string', description: 'International format, digits only: 5219841234567'}),
    defineField({name: 'phone', type: 'string'}),
    defineField({name: 'email', type: 'string', validation: (r) => r.email()}),
    defineField({name: 'languages', type: 'array', of: [defineArrayMember({type: 'string'})], options: {list: ['es', 'en']}}),
  ],
  preview: {select: {title: 'name', subtitle: 'role.es', media: 'photo'}},
})

export const listingSection = defineType({
  name: 'listingSection',
  title: 'Section page',
  type: 'document',
  icon: ThLargeIcon,
  description: 'Top-level section: Vacation stays, Rentals, For sale. Exactly one per type.',
  fields: [
    defineField({
      name: 'sectionType',
      type: 'string',
      options: {list: LISTING_TYPES, layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'navLabel', type: 'localeString', validation: (r) => r.required()}),
    defineField({name: 'title', type: 'localeString', validation: (r) => r.required()}),
    defineField({name: 'tagline', type: 'localeString'}),
    defineField({name: 'intro', type: 'localeBlock'}),
    defineField({
      name: 'primaryCta',
      type: 'localeString',
      description: 'Verb on property pages: "Book your stay", "Book a tour", "Book a viewing".',
    }),
    defineField({name: 'heroImage', type: 'image', options: {hotspot: true}}),
    defineField({
      name: 'personas',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'persona'}]})],
      description: 'Personas shown as shortcuts in this section, in order.',
    }),
    defineField({name: 'seo', type: 'seo'}),
  ],
  preview: {select: {title: 'navLabel.es', subtitle: 'sectionType', media: 'heroImage'}},
})

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({name: 'title', type: 'localeString', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title.es'}, validation: (r) => r.required()}),
    defineField({name: 'body', type: 'localeBlock'}),
    defineField({name: 'seo', type: 'seo'}),
  ],
  preview: {select: {title: 'title.es', subtitle: 'slug.current'}},
})

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({name: 'siteName', type: 'string', initialValue: 'A Toda Madre'}),
    defineField({name: 'tagline', type: 'localeString'}),
    defineField({name: 'whatsapp', type: 'string'}),
    defineField({name: 'email', type: 'string'}),
    defineField({name: 'legalEntity', type: 'string', description: 'Razón social shown in the footer and on invoices.'}),
    defineField({name: 'rfc', type: 'string'}),
    defineField({
      name: 'defaultCurrency',
      type: 'string',
      initialValue: 'MXN',
      options: {list: ['MXN', 'USD'], layout: 'radio'},
    }),
    defineField({
      name: 'estimatedTaxPercent',
      type: 'number',
      initialValue: 19,
      validation: (r) => r.min(0).max(40),
      description:
        'Placeholder used only to show an estimated total before the booking API quotes exact taxes (IVA + lodging tax). Confirm rates with your accountant.',
    }),
    defineField({
      name: 'usdToMxn',
      title: 'USD to MXN rate',
      type: 'number',
      validation: (r) => r.min(1),
      description: 'Placeholder rate used only for price filters across currencies. Not used for charging.',
    }),
    defineField({name: 'trustPoints', type: 'array', of: [defineArrayMember({type: 'localeString'})], description: 'Short reassurance lines, e.g. "No service fee".'}),
    defineField({name: 'seo', type: 'seo'}),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
