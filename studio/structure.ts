import type {StructureResolver} from 'sanity/structure'
import {CogIcon, HomeIcon} from '@sanity/icons'

const SINGLETONS = ['siteSettings']
export const singletonTypes = new Set(SINGLETONS)

const byType = (S: Parameters<StructureResolver>[0], title: string, type: string) =>
  S.listItem()
    .title(title)
    .icon(HomeIcon)
    .child(
      S.documentList()
        .title(title)
        .filter('_type == "property" && listingType == $type')
        .params({type})
        .defaultOrdering([{field: 'title.es', direction: 'asc'}]),
    )

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Prop.bz')
    .items([
      S.listItem()
        .title('Site settings')
        .icon(CogIcon)
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.listItem()
        .title('Properties')
        .icon(HomeIcon)
        .child(
          S.list()
            .title('Properties')
            .items([
              byType(S, 'Vacation stays', 'vacation'),
              byType(S, 'Rentals (1–11 months)', 'rental'),
              byType(S, 'For sale', 'sale'),
              S.divider(),
              S.documentTypeListItem('property').title('All properties'),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem('listingSection').title('Section pages'),
      S.documentTypeListItem('persona').title('Personas'),
      S.documentTypeListItem('area').title('Areas'),
      S.documentTypeListItem('amenity').title('Amenities'),
      S.documentTypeListItem('agent').title('Contacts'),
      S.documentTypeListItem('page').title('Pages'),
    ])
