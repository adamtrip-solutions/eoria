import type { APIRoute } from 'astro'
import { getCollection, render } from 'astro:content'
import { groupDocs, SECTIONS } from '../lib/docs-nav.mjs'

/**
 * The index the header search loads on first open: every page with its tab, its sidebar group
 * and its second-level headings, in sidebar order.
 */
export const GET: APIRoute = async () => {
  const pages = []
  for (const group of groupDocs(await getCollection('docs'))) {
    const section = SECTIONS.find((s) => s.key === group.section)!.label
    for (const entry of group.items) {
      const { headings } = await render(entry)
      pages.push({
        title: entry.data.title,
        description: entry.data.description,
        href: `/${entry.id}/`,
        section,
        group: group.label,
        headings: headings
          .filter((h) => h.depth === 2)
          .map((h) => ({ slug: h.slug, text: h.text })),
      })
    }
  }
  return new Response(JSON.stringify(pages), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
