import {defineField, defineType} from 'sanity'

export const seo = defineType({
  name: 'seo',
  title: 'SEO & sharing',
  type: 'object',
  options: {collapsible: true, collapsed: true},
  fields: [
    defineField({
      name: 'title',
      type: 'localeString',
      description: 'Overrides the page title in search results. Keep under 60 characters.',
    }),
    defineField({
      name: 'description',
      type: 'localeText',
      description: 'Search result snippet. Keep under 160 characters.',
    }),
    defineField({
      name: 'image',
      type: 'image',
      description: 'Social sharing image (1200×630). Falls back to the first gallery photo.',
    }),
    defineField({
      name: 'noIndex',
      type: 'boolean',
      initialValue: false,
      description: 'Hide this page from search engines.',
    }),
  ],
})
