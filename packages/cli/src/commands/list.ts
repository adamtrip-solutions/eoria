import pc from 'picocolors'
import { loadContext, type ReadOptions } from '../context'
import { log } from '../log'
import { columns, printJson } from '../print'

export interface ListOptions extends ReadOptions {
  json?: boolean
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

/** Every item in the registry index, in registry order. */
export async function listItems(root: string, options: ReadOptions = {}): Promise<ItemList> {
  const { config, registry } = await loadContext(root, options)
  const index = await registry.index()
  const items = index.items.map((item) => ({
    name: item.name,
    title: item.title ?? item.name,
    description: item.description ?? '',
    type: item.type,
    installed: config ? item.name in config.installed : null,
  }))
  return { registry: registry.base, items }
}

export function printItems(items: ListedItem[]): void {
  const rows = items.map((item) => [item.name, item.title, item.description])
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
