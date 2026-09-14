// Shared ordering for the sidebar and llms.txt so both list pages identically.

export const CATEGORY_ORDER = ['Layout', 'Forms', 'Display', 'Overlays', 'Primitives']

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
 * @returns {{label: string, items: T[]}[]}
 */
export function groupDocs(all) {
  const components = all.filter((e) => e.id.startsWith('components/'))
  const groups = [
    { label: 'Start', items: all.filter((e) => e.id.startsWith('start/')).sort(byOrder) },
    ...CATEGORY_ORDER.map((label) => ({
      label,
      items: components.filter((e) => e.data.category === label).sort(byOrder),
    })),
  ]
  const listed = new Set(groups.flatMap((g) => g.items).map((e) => e.id))
  const missing = all.filter((e) => !listed.has(e.id)).map((e) => e.id)
  if (missing.length > 0) {
    throw new Error(`Pages outside a known section or category: ${missing.join(', ')}`)
  }
  return groups
}
