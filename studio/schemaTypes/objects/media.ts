import {defineArrayMember, defineField, defineType} from 'sanity'

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

/* ------------------------------------------------------------ virtual tour */

export const tourLink = defineType({
  name: 'tourLink',
  title: 'Link to another room',
  type: 'object',
  fields: [
    defineField({name: 'to', title: 'Goes to (room ID)', type: 'string', validation: (r) => r.required(), description: 'The ID of the room this arrow leads to.'}),
    defineField({name: 'label', type: 'localeString', description: 'Shown to screen readers and on hover, e.g. "Kitchen".'}),
    defineField({name: 'yaw', title: 'Direction (degrees, 0 = straight ahead, 90 = right)', type: 'number', validation: (r) => r.required().min(-180).max(180)}),
    defineField({name: 'pitch', title: 'Height (degrees, 0 = horizon, negative = down)', type: 'number', initialValue: -8, validation: (r) => r.min(-80).max(80)}),
  ],
  preview: {select: {title: 'label.es', subtitle: 'to'}},
})

export const tourScene = defineType({
  name: 'tourScene',
  title: 'Tour room',
  type: 'object',
  fields: [
    defineField({name: 'id', title: 'Room ID', type: 'string', validation: (r) => r.required().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes'), description: 'Short and unique within this tour, e.g. "living-room".'}),
    defineField({name: 'title', type: 'localeString', validation: (r) => r.required()}),
    defineField({
      name: 'panorama',
      type: 'image',
      validation: (r) => r.required(),
      description: '360° photo in equirectangular format (2:1, for example 8192×4096). Phone panorama modes and 360 cameras export this.',
    }),
    defineField({name: 'initialYaw', title: 'Starting direction (degrees)', type: 'number', initialValue: 0, validation: (r) => r.min(-180).max(180)}),
    defineField({name: 'links', type: 'array', of: [defineArrayMember({type: 'tourLink'})], description: 'Arrows that move the visitor to the next room.'}),
  ],
  preview: {select: {title: 'title.es', subtitle: 'id', media: 'panorama'}},
})

export const virtualTour = defineType({
  name: 'virtualTour',
  title: 'Virtual tour',
  type: 'object',
  description: 'A 360° walkthrough shown full-screen. It is the main call to action for booking a viewing.',
  fields: [
    defineField({name: 'scenes', type: 'array', of: [defineArrayMember({type: 'tourScene'})], validation: (r) => r.max(12)}),
    defineField({name: 'startScene', title: 'First room (room ID)', type: 'string', description: 'Leave empty to start at the first room in the list.'}),
    defineField({name: 'externalUrl', title: 'Hosted tour URL (optional)', type: 'url', validation: (r) => r.uri({scheme: ['https']}), description: 'Matterport, Kuula or similar. Shown as a secondary link next to the built-in tour.'}),
  ],
})
