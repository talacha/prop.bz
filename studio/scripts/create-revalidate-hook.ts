/**
 * Creates the Sanity webhook that tells the website to refresh when content is published.
 * Run: REVALIDATE_SECRET=... npx sanity exec scripts/create-revalidate-hook.ts --with-user-token
 * The secret must equal SANITY_REVALIDATE_SECRET on the website's Vercel project.
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-02-01'})
const {projectId, token} = client.config()
const secret = process.env.REVALIDATE_SECRET
if (!secret || !token) throw new Error('REVALIDATE_SECRET and a CLI login are required')

const api = `https://api.sanity.io/v2021-10-04/hooks/projects/${projectId}`
const headers = {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}
const NAME = 'Refresh website (www.prop.bz)'

async function main() {
  const existing = (await (await fetch(api, {headers})).json()) as {id: string; name: string}[]
  for (const h of existing.filter((x) => x.name === NAME)) await fetch(`${api}/${h.id}`, {method: 'DELETE', headers})

  const res = await fetch(api, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: NAME,
      type: 'document',
      url: 'https://www.prop.bz/api/revalidate',
      httpMethod: 'POST',
      dataset: 'production',
      // Published content that the site renders. Drafts never trigger it.
      rule: {on: ['create', 'update', 'delete'], filter: '_type in ["property","listingSection","persona","area","amenity","agent","page","siteSettings"]', projection: '{_id, _type}'},
      headers: {'x-revalidate-secret': secret},
      includeDrafts: false,
      includeAllVersions: false,
      apiVersion: 'v2026-02-01',
    }),
  })
  const body = (await res.json()) as {id?: string; message?: string}
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 300)}`)
  console.log(`webhook created: ${body.id}`)
}
main().catch((e) => { console.error(String(e)); process.exit(1) })
