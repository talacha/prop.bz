import {defineArrayMember, defineField, defineType} from 'sanity'

export const LOCALES = [
  {id: 'es', title: 'Español'},
  {id: 'en', title: 'English'},
] as const

// Field-level localization: one document, every language side by side.
// Spanish is the source language (required); English is optional and the app falls back to Spanish.
export const localeString = defineType({
  name: 'localeString',
  title: 'Localized string',
  type: 'object',
  options: {columns: 2},
  fields: LOCALES.map((l) =>
    defineField({
      name: l.id,
      title: l.title,
      type: 'string',
      validation: l.id === 'es' ? (rule) => rule.required() : undefined,
    }),
  ),
})

export const localeText = defineType({
  name: 'localeText',
  title: 'Localized text',
  type: 'object',
  fields: LOCALES.map((l) =>
    defineField({
      name: l.id,
      title: l.title,
      type: 'text',
      rows: 3,
      validation: l.id === 'es' ? (rule) => rule.required() : undefined,
    }),
  ),
})

export const localeBlock = defineType({
  name: 'localeBlock',
  title: 'Localized rich text',
  type: 'object',
  fields: LOCALES.map((l) =>
    defineField({
      name: l.id,
      title: l.title,
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
    }),
  ),
})
