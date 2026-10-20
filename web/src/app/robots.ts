import type {MetadataRoute} from 'next'
import {SITE_URL} from '@/lib/site'

// Search and AI-answer crawlers are welcome so listings can be found and cited.
// To opt out of model training only, move GPTBot, Google-Extended, CCBot, ClaudeBot and Applebot-Extended to `disallow: '/'`.
const AI_AND_SEARCH_BOTS = [
  'Googlebot', 'Bingbot', 'DuckDuckBot', 'Applebot',
  'OAI-SearchBot', 'ChatGPT-User', 'GPTBot',
  'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'cohere-ai', 'Meta-ExternalAgent',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {userAgent: '*', allow: '/', disallow: ['/api/']},
      {userAgent: AI_AND_SEARCH_BOTS, allow: '/', disallow: ['/api/']},
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
