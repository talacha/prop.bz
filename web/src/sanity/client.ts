import {createClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from './env'

// Published content only. Reads go to the origin API, not the read CDN: Next already caches every result
// (cache tag "sanity", refreshed by the publish webhook), and the CDN can still hand back the old copy for a
// minute after an edit, which made webhook refreshes look like they did nothing.
export const client = createClient({projectId, dataset, apiVersion, useCdn: false, perspective: 'published'})
