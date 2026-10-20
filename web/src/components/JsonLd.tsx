import {jsonLdString} from '@/lib/site'

export function JsonLd({data}: {data: unknown | unknown[]}) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLdString(data)}} />
}
