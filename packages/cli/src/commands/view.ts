import { loadContext, type ReadOptions } from '../context'
import { assertPlainName, localPath, rewriteAlias } from '../files'
import { CliError, log } from '../log'
import { printJson } from '../print'

export interface ViewOptions extends ReadOptions {
  json?: boolean
  source?: boolean
}

export interface ViewedFile {
  /** Path inside the registry repository. */
  path: string
  type: string
  /** The registry target, such as `components/ui/button.tsx`. */
  target: string
  /** Where `add` writes the file in this project. Null outside a project. */
  localPath: string | null
  /** Present with `source`. Imports use the project's alias when there is a project. */
  content?: string
}

export interface ViewedItem {
  registry: string
  name: string
  title: string
  description: string
  type: string
  /** npm packages the item itself declares. */
  dependencies: string[]
  /** Registry items the item itself names. */
  registryDependencies: string[]
  /** Every registry item `add` would bring along, dependencies first. */
  allRegistryDependencies: string[]
  /** npm packages of the item and of everything in `allRegistryDependencies`. */
  allDependencies: string[]
  /** Null outside a project. */
  installed: boolean | null
  files: ViewedFile[]
}

export async function viewItem(
  root: string,
  name: string,
  options: ReadOptions & { source?: boolean } = {},
): Promise<ViewedItem> {
  try {
    assertPlainName(name, 'item')
  } catch (error) {
    throw new CliError((error as Error).message)
  }
  const { config, registry } = await loadContext(root, options)
  const resolved = await registry.resolve([name])
  const item = resolved[resolved.length - 1]!
  return {
    registry: registry.base,
    name: item.name,
    title: item.title ?? item.name,
    description: item.description ?? '',
    type: item.type,
    dependencies: item.dependencies ?? [],
    registryDependencies: item.registryDependencies ?? [],
    allRegistryDependencies: resolved.slice(0, -1).map((dep) => dep.name),
    allDependencies: [...new Set(resolved.flatMap((dep) => dep.dependencies ?? []))],
    installed: config ? item.name in config.installed : null,
    files: item.files.map((file) => ({
      path: file.path,
      type: file.type,
      target: file.target ?? file.path,
      localPath: config ? localPath(config.components, file) : null,
      ...(options.source
        ? { content: config ? rewriteAlias(file.content, config.alias) : file.content }
        : {}),
    })),
  }
}

export async function view(root: string, name: string, options: ViewOptions): Promise<void> {
  const item = await viewItem(root, name, options)
  if (options.json) return printJson(item)

  const list = (values: string[]) => (values.length > 0 ? values.join(', ') : 'none')
  const marker = item.installed ? ` ${log.dim('installed')}` : ''
  log.info(`${log.bold(item.title)} ${log.dim(item.name)}${marker}`)
  if (item.description) log.info(item.description)
  log.info('')
  log.info(`npm dependencies       ${list(item.dependencies)}`)
  log.info(`registry dependencies  ${list(item.registryDependencies)}`)
  log.info(`add also brings        ${list(item.allRegistryDependencies)}`)
  log.info(`npm, all items         ${list(item.allDependencies)}`)
  log.info('')
  for (const file of item.files) {
    log.info(`${file.target}${file.localPath ? ` ${log.dim(`> ${file.localPath}`)}` : ''}`)
  }
  for (const file of item.files) {
    if (file.content === undefined) continue
    log.info('')
    log.info(log.dim(`--- ${file.localPath ?? file.target}`))
    console.log(file.content)
  }
}
