import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { renderAgentIndex } from '../lib/agent-docs.mjs'

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('Agent documentation requires the Astro site URL')
  return new Response(renderAgentIndex(await getCollection('docs'), site), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
