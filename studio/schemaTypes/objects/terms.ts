import {defineArrayMember, defineField, defineType} from 'sanity'

const currency = (name = 'currency') =>
  defineField({
    name,
    type: 'string',
    initialValue: 'MXN',
    options: {list: ['MXN', 'USD'], layout: 'radio', direction: 'horizontal'},
    validation: (rule) => rule.required(),
  })

const money = (name: string, title?: string, description?: string) =>
  defineField({name, title, description, type: 'number', validation: (rule) => rule.min(0)})

/* ---------------------------------------------------------------- vacation */

export const seasonalRate = defineType({
  name: 'seasonalRate',
  title: 'Seasonal rate',
  type: 'object',
  fields: [
    defineField({name: 'label', type: 'localeString', description: 'e.g. Christmas / New Year'}),
    defineField({name: 'from', type: 'date', validation: (r) => r.required()}),
    defineField({name: 'to', type: 'date', validation: (r) => r.required()}),
    money('nightlyRate', 'Nightly rate'),
    defineField({name: 'minNights', type: 'number', validation: (r) => r.min(1).integer()}),
  ],
  preview: {select: {title: 'label.es', subtitle: 'from'}},
})

export const vacationTerms = defineType({
  name: 'vacationTerms',
  title: 'Vacation rental terms',
  type: 'object',
  description: 'Stays of days or weeks. Live availability and exact totals come from the booking API.',
  fields: [
    currency(),
    money('nightlyRate', 'Base nightly rate', 'Shown as "from" price. The booking API is the source of truth for quotes.'),
    money('weekendNightlyRate', 'Weekend nightly rate'),
    money('cleaningFee', 'Cleaning fee'),
    money('securityDeposit', 'Security deposit (card hold)'),
    defineField({name: 'minNights', type: 'number', initialValue: 2, validation: (r) => r.min(1).integer()}),
    defineField({name: 'maxNights', type: 'number', initialValue: 28, validation: (r) => r.min(1).integer()}),
    defineField({name: 'checkInTime', type: 'string', initialValue: '15:00'}),
    defineField({name: 'checkOutTime', type: 'string', initialValue: '11:00'}),
    defineField({name: 'instantBook', type: 'boolean', initialValue: true}),
    defineField({
      name: 'cancellationPolicy',
      type: 'string',
      initialValue: 'flexible',
      options: {
        list: [
          {title: 'Flexible: full refund until 7 days before', value: 'flexible'},
          {title: 'Moderate: full refund until 14 days before', value: 'moderate'},
          {title: 'Strict: 50% refund until 30 days before', value: 'strict'},
        ],
      },
    }),
    defineField({name: 'houseRules', type: 'localeBlock'}),
    defineField({
      name: 'seasonalRates',
      type: 'array',
      of: [defineArrayMember({type: 'seasonalRate'})],
    }),
  ],
})

/* ------------------------------------------------------------------ rental */

export const rentalTerms = defineType({
  name: 'rentalTerms',
  title: 'Short-term lease terms',
  type: 'object',
  description: 'Leases shorter than 12 months (1 to 11 months).',
  fields: [
    currency(),
    money('monthlyRent', 'Monthly rent'),
    defineField({
      name: 'depositMonths',
      title: 'Deposit (months of rent)',
      type: 'number',
      initialValue: 1,
      validation: (r) => r.min(0).max(3),
    }),
    defineField({
      name: 'minLeaseMonths',
      type: 'number',
      initialValue: 1,
      validation: (r) => r.required().integer().min(1).max(11),
    }),
    defineField({
      name: 'maxLeaseMonths',
      type: 'number',
      initialValue: 11,
      validation: (r) =>
        r.required().integer().min(1).max(11).custom((value, ctx) => {
          const min = (ctx.parent as {minLeaseMonths?: number} | undefined)?.minLeaseMonths
          return min && value && value < min ? 'Must be at least the minimum lease length' : true
        }),
    }),
    defineField({name: 'availableFrom', type: 'date'}),
    defineField({
      name: 'utilitiesIncluded',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {list: ['water', 'electricity', 'internet', 'gas', 'maintenance fee', 'cleaning']},
    }),
    money('maintenanceFee', 'Maintenance fee (monthly, if not included)'),
    defineField({
      name: 'petsPolicy',
      type: 'string',
      initialValue: 'ask',
      options: {list: [{title: 'Pets allowed', value: 'allowed'}, {title: 'No pets', value: 'none'}, {title: 'Ask owner', value: 'ask'}]},
    }),
    defineField({
      name: 'requirements',
      type: 'array',
      description: 'What applicants must provide.',
      of: [defineArrayMember({type: 'localeString'})],
    }),
  ],
})

/* -------------------------------------------------------------------- sale */

export const rentalIncomeEstimate = defineType({
  name: 'rentalIncomeEstimate',
  title: 'Investor estimate',
  type: 'object',
  description: 'Optional. Shown to the Investor persona. Label clearly as an estimate.',
  fields: [
    currency(),
    money('monthlyRevenue', 'Estimated monthly revenue'),
    defineField({name: 'occupancyPercent', type: 'number', validation: (r) => r.min(0).max(100)}),
    defineField({name: 'basis', type: 'localeString', description: 'Where the estimate comes from.'}),
  ],
})

export const saleTerms = defineType({
  name: 'saleTerms',
  title: 'Sale terms',
  type: 'object',
  fields: [
    currency(),
    money('askingPrice', 'Asking price'),
    money('annualPropertyTax', 'Predial (annual property tax)'),
    money('monthlyMaintenanceFee', 'Monthly maintenance / HOA'),
    defineField({
      name: 'ownership',
      type: 'string',
      description: 'Title type. Foreign buyers in the restricted coastal zone typically use a fideicomiso.',
      options: {
        list: [
          {title: 'Escritura (fee simple)', value: 'escritura'},
          {title: 'Fideicomiso (bank trust)', value: 'fideicomiso'},
          {title: 'Ejido / other (ask)', value: 'other'},
        ],
      },
    }),
    defineField({name: 'yearBuilt', type: 'number', validation: (r) => r.integer().min(1900).max(2100)}),
    defineField({
      name: 'financing',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {list: ['cash', 'bank mortgage', 'developer financing', 'seller financing']},
    }),
    defineField({name: 'hoaIncludes', type: 'localeString'}),
    defineField({name: 'incomeEstimate', type: 'rentalIncomeEstimate'}),
  ],
})

/* ----------------------------------------------------------------- helpers */

export const bedEntry = defineType({
  name: 'bedEntry',
  title: 'Beds',
  type: 'object',
  fields: [
    defineField({
      name: 'type',
      type: 'string',
      options: {list: ['king', 'queen', 'double', 'single', 'sofa bed', 'bunk']},
      validation: (r) => r.required(),
    }),
    defineField({name: 'count', type: 'number', initialValue: 1, validation: (r) => r.required().integer().min(1)}),
  ],
  preview: {select: {title: 'type', subtitle: 'count'}},
})

export const amenityEntry = defineType({
  name: 'amenityEntry',
  title: 'Amenity',
  type: 'object',
  fields: [
    defineField({
      name: 'amenity',
      type: 'reference',
      to: [{type: 'amenity'}],
      validation: (r) => r.required(),
    }),
    defineField({name: 'detail', type: 'localeString', description: 'Optional, e.g. "Shared", "2 units".'}),
  ],
  preview: {select: {title: 'amenity.label.es', subtitle: 'detail.es'}},
})

export const viewingOptions = defineType({
  name: 'viewingOptions',
  title: 'Viewings',
  type: 'object',
  description: 'How people can see this property. Requests go to the booking API, not to Sanity.',
  fields: [
    defineField({name: 'enabled', type: 'boolean', initialValue: true}),
    defineField({
      name: 'modes',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {list: [{title: 'In person', value: 'in-person'}, {title: 'Video call', value: 'video'}]},
      initialValue: ['in-person', 'video'],
    }),
    defineField({name: 'slotMinutes', type: 'number', initialValue: 30}),
    defineField({name: 'leadTimeHours', type: 'number', initialValue: 12}),
    defineField({name: 'notes', type: 'localeString'}),
  ],
})
