// Shared ordering for the sidebar, the header tabs, the search index and llms.txt, so all
// four list pages identically.

export const CATEGORY_ORDER = ['Layout', 'Forms', 'Display', 'Overlays', 'Primitives']
export const BLOCK_CATEGORY_ORDER = ['Auth', 'App', 'Commerce', 'Account', 'Social']

/**
 * The header tabs. Each owns the pages under its folders and shows only those in the sidebar.
 * `home` is the page the tab opens.
 */
export const SECTIONS = [
  { key: 'docs', label: 'Docs', folders: ['start', 'changelog'], home: '/start/introduction/' },
  {
    key: 'components',
    label: 'Components',
    folders: ['components'],
    home: '/components/accordion/',
  },
  { key: 'blocks', label: 'Blocks', folders: ['blocks'], home: '/blocks/overview/' },
  { key: 'guides', label: 'Guides', folders: ['guides'], home: '/guides/forms/' },
  { key: 'agents', label: 'Agents', folders: ['agents'], home: '/agents/overview/' },
]

/** @param {string} id a collection id or a pathname without its leading slash */
export const sectionOf = (id) => SECTIONS.find((s) => s.folders.includes(id.split('/')[0]))

/**
 * @typedef {{id: string, data: {title: string, description: string, category?: string, sidebar?: {order?: number}}}} DocEntry
 */

/** @param {DocEntry} a @param {DocEntry} b */
export const byOrder = (a, b) =>
  (a.data.sidebar?.order ?? 999) - (b.data.sidebar?.order ?? 999) ||
  a.data.title.localeCompare(b.data.title)

/**
 * Group collection entries as the sidebar shows them. Throws when a page falls outside a
 * known section or category so it cannot silently vanish from navigation.
 * @template {DocEntry} T
 * @param {T[]} all
 * @returns {{label: string, section: string, items: T[]}[]}
 */
export function groupDocs(all) {
  const under = (folder) => all.filter((e) => e.id.startsWith(`${folder}/`))
  const components = under('components')
  const blocks = under('blocks')
  const groups = [
    { label: 'Start', section: 'docs', items: under('start').sort(byOrder) },
    { label: 'Changelog', section: 'docs', items: under('changelog').sort(byOrder) },
    ...CATEGORY_ORDER.map((label) => ({
      label,
      section: 'components',
      items: components.filter((e) => e.data.category === label).sort(byOrder),
    })),
    {
      label: 'Blocks',
      section: 'blocks',
      items: blocks.filter((e) => e.data.category === undefined).sort(byOrder),
    },
    ...BLOCK_CATEGORY_ORDER.map((label) => ({
      label,
      section: 'blocks',
      items: blocks.filter((e) => e.data.category === label).sort(byOrder),
    })),
    { label: 'Guides', section: 'guides', items: under('guides').sort(byOrder) },
    { label: 'Agents', section: 'agents', items: under('agents').sort(byOrder) },
  ].filter((g) => g.items.length > 0)
  const listed = new Set(groups.flatMap((g) => g.items).map((e) => e.id))
  const missing = all.filter((e) => !listed.has(e.id)).map((e) => e.id)
  if (missing.length > 0) {
    throw new Error(`Pages outside a known section or category: ${missing.join(', ')}`)
  }
  return groups
}
