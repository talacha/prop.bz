import {defineField, defineType} from 'sanity'

export const galleryImage = defineType({
  name: 'galleryImage',
  title: 'Photo',
  type: 'image',
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'localeString',
      description: 'Describe what the photo shows for screen readers, e.g. "Living room with sea view".',
    }),
    defineField({
      name: 'caption',
      type: 'localeString',
    }),
    defineField({
      name: 'room',
      type: 'string',
      description: 'Used to group photos in the gallery grid.',
      options: {
        list: [
          {title: 'Exterior / building', value: 'exterior'},
          {title: 'Living / dining', value: 'living'},
          {title: 'Kitchen', value: 'kitchen'},
          {title: 'Bedroom', value: 'bedroom'},
          {title: 'Bathroom', value: 'bathroom'},
          {title: 'Terrace / balcony', value: 'terrace'},
          {title: 'Pool / amenities', value: 'amenities'},
          {title: 'Neighborhood', value: 'neighborhood'},
          {title: 'Floor plan', value: 'floorplan'},
        ],
      },
    }),
  ],
})
