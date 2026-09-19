import { CliError, log } from '../log'
import { printJson } from '../print'
import { listItems, printItems, type ListedItem, type ListReadOptions } from './list'

export interface SearchOptions extends ListReadOptions {
  json?: boolean
}

export interface SearchResult {
  registry: string
  query: string
  items: ListedItem[]
}

/** Lower is better. Null when the term appears nowhere in the item. */
function rank(item: ListedItem, term: string): number | null {
  const name = item.name.toLowerCase()
  if (name === term) return 0
  if (name.startsWith(term)) return 1
  if (name.includes(term)) return 2
  if (item.title.toLowerCase().includes(term)) return 3
  if (item.description.toLowerCase().includes(term)) return 4
  return null
}

/**
 * Items whose name, title or description contains every word of the query, ignoring case.
 * Name matches come first, then title, then description. Ties keep registry order. `type`
 * keeps one type of item.
 */
export async function searchItems(
  root: string,
  query: string,
  options: ListReadOptions = {},
): Promise<SearchResult> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) throw new CliError('Give search something to look for.')
  const { registry, items } = await listItems(root, options)
  const scored: Array<{ item: ListedItem; score: number }> = []
  for (const item of items) {
    const ranks = terms.map((term) => rank(item, term))
    if (ranks.some((value) => value === null)) continue
    scored.push({ item, score: ranks.reduce<number>((sum, value) => sum + (value ?? 0), 0) })
  }
  scored.sort((a, b) => a.score - b.score)
  return { registry, query, items: scored.map((entry) => entry.item) }
}

export async function search(root: string, query: string, options: SearchOptions): Promise<void> {
  const result = await searchItems(root, query, options)
  if (options.json) return printJson(result)
  if (result.items.length === 0) {
    log.info(`Nothing matches "${query}". \`eoria list\` prints every item.`)
    return
  }
  printItems(result.items)
}
