import pc from 'picocolors'
import { loadContext, type ReadOptions } from '../context'
import { CliError, log } from '../log'
import { columns, printJson } from '../print'

/** What `--type` takes. `ui` is a component and `block` a full screen made of components. */
export const ITEM_TYPES = ['ui', 'block'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

/** Options of the commands that list registry items. */
export interface ListReadOptions extends ReadOptions {
  /** Keep only items of this type. */
  type?: string | undefined
}

export interface ListOptions extends ListReadOptions {
  json?: boolean
}

/** `registry:block` for `block`. Throws on a type the registry does not have. */
function registryType(type: string): string {
  if (!(ITEM_TYPES as readonly string[]).includes(type)) {
    throw new CliError(`--type takes ${ITEM_TYPES.join(' or ')}, got "${type}".`)
  }
  return `registry:${type}`
}

/** `block` for `registry:block`, the way the table prints a type. */
function shortType(type: string): string {
  return type.replace(/^registry:/, '')
}

export interface ListedItem {
  name: string
  title: string
  description: string
  type: string
  /** Null outside a project, where there is no `eoria.json` to look in. */
  installed: boolean | null
}

export interface ItemList {
  registry: string
  items: ListedItem[]
}

/** Every item in the registry index, in registry order. `type` keeps one type of item. */
export async function listItems(root: string, options: ListReadOptions = {}): Promise<ItemList> {
  const wanted = options.type === undefined ? null : registryType(options.type)
  const { config, registry } = await loadContext(root, options)
  const index = await registry.index()
  const kept = wanted ? index.items.filter((item) => item.type === wanted) : index.items
  const items = kept.map((item) => ({
    name: item.name,
    title: item.title ?? item.name,
    description: item.description ?? '',
    type: item.type,
    installed: config ? item.name in config.installed : null,
  }))
  return { registry: registry.base, items }
}

export function printItems(items: ListedItem[]): void {
  const rows = items.map((item) => [item.name, shortType(item.type), item.title, item.description])
  columns(rows).forEach((line, index) => {
    console.log(`${items[index]!.installed ? pc.green('✓') : ' '} ${line}`)
  })
}

export async function list(root: string, options: ListOptions): Promise<void> {
  const result = await listItems(root, options)
  if (options.json) return printJson(result)
  printItems(result.items)
  const installed = result.items.filter((item) => item.installed).length
  const inProject = result.items.some((item) => item.installed !== null)
  log.info('')
  log.info(
    log.dim(
      `${result.items.length} items${inProject ? `, ${installed} installed` : ''}. Registry: ${result.registry}`,
    ),
  )
}
