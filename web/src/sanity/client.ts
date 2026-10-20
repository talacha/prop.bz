import {createClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from './env'

// Published content only. Reads go through the CDN; freshness is handled by cache tags
// and the /api/revalidate webhook, not by bypassing the CDN.
export const client = createClient({projectId, dataset, apiVersion, useCdn: true, perspective: 'published'})
