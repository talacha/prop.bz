import {buildLlmsFullTxt} from '@/lib/llms'

export async function GET() {
  return new Response(await buildLlmsFullTxt(), {headers: {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'}})
}
