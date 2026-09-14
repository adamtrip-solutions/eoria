import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection, type CollectionEntry } from 'astro:content'
import registry from '../../../../registry/registry.json'
import { renderAgentDoc } from '../lib/agent-docs.mjs'

export const getStaticPaths = (async () => {
  const entries = await getCollection('docs')
  const ids = entries.map((entry) => entry.id)
  for (const item of registry.items) {
    if (!ids.includes(`components/${item.name}`)) {
      throw new Error(`Missing component documentation: ${item.name}`)
    }
  }
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry, ids } }))
}) satisfies GetStaticPaths

export const GET: APIRoute = ({ props, site }) => {
  const { entry, ids } = props as { entry: CollectionEntry<'docs'>; ids: string[] }
  if (!site) throw new Error('Agent documentation requires the Astro site URL')
  const item = registry.items.find((candidate) => entry.id === `components/${candidate.name}`)
  return new Response(
    renderAgentDoc(
      { id: entry.id, ...entry.data, body: entry.body ?? '' },
      new Set(ids),
      site,
      item,
    ),
    { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
  )
}
