import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection, type CollectionEntry } from 'astro:content'
import registry from '../../../../registry/registry.json'
import { presets } from '@eoria/core/tokens'
import { renderAgentDoc } from '../lib/agent-docs.mjs'
import { presetHints, presetNames } from '../lib/presets'
import { presetSource, presetUsage } from '../lib/preset-code.mjs'

/** The preset tabs as Markdown: every preset with the line that uses it and its full source. */
const markdownBlocks = {
  PresetTabs: () =>
    presetNames.flatMap((name) => [
      { type: 'heading', depth: 3, children: [{ type: 'text', value: name }] },
      { type: 'paragraph', children: [{ type: 'text', value: `${presetHints[name]}.` }] },
      { type: 'code', lang: 'ts', value: presetUsage(name) },
      { type: 'code', lang: 'ts', value: presetSource(name, presets[name]) },
    ]),
}

/** Blocks are documented under /blocks, everything else under /components. */
const pageOf = (item: { name: string; type: string }) =>
  `${item.type === 'registry:block' ? 'blocks' : 'components'}/${item.name}`

export const getStaticPaths = (async () => {
  const entries = await getCollection('docs')
  const ids = entries.map((entry) => entry.id)
  for (const item of registry.items) {
    if (!ids.includes(pageOf(item))) {
      throw new Error(`Missing documentation: ${pageOf(item)}`)
    }
  }
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry, ids } }))
}) satisfies GetStaticPaths

export const GET: APIRoute = ({ props, site }) => {
  const { entry, ids } = props as { entry: CollectionEntry<'docs'>; ids: string[] }
  if (!site) throw new Error('Agent documentation requires the Astro site URL')
  const item = registry.items.find((candidate) => entry.id === pageOf(candidate))
  return new Response(
    renderAgentDoc(
      { id: entry.id, ...entry.data, body: entry.body ?? '' },
      new Set(ids),
      site,
      item,
      markdownBlocks,
    ),
    { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
  )
}
