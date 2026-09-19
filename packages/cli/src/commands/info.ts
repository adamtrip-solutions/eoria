import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { CONFIG_FILE, readConfig, type EoriaConfig } from '../config'
import { pickRegistry, type ReadOptions } from '../context'
import { hashContent, localPath, rewriteAlias } from '../files'
import { log } from '../log'
import { columns, printJson } from '../print'
import { detectPackageManager, readPackageJson, usesExpo, type PackageManager } from '../project'
import { RegistryError, type Registry } from '../registry'
import { fileStatus, STATUS_LABELS, type FileStatus } from '../status'
import { CLI_VERSION } from '../version'

export interface InfoOptions extends ReadOptions {
  json?: boolean
}

/** The peers whose versions decide whether copied components compile and animate. */
export const REPORTED_PACKAGES = [
  '@eoria/core',
  'react-native-unistyles',
  'react-native-reanimated',
  'react-native-worklets',
]

/** `unknown` means the registry could not supply the item, so only local edits show. */
export type InfoFileStatus = FileStatus | 'unknown'

export interface InstalledFile {
  path: string
  status: InfoFileStatus
  label: string
}

export interface InstalledItem {
  name: string
  files: InstalledFile[]
}

export interface ProjectInfo {
  cli: { version: string }
  /** The folder holding `eoria.json` or `package.json`. */
  root: string
  config: {
    /** Absolute path of `eoria.json`, or null when there is none. */
    path: string | null
    /** Why `eoria.json` could not be read, or null. */
    error: string | null
    values: Pick<EoriaConfig, 'registry' | 'components' | 'alias'> | null
  }
  registry: {
    location: string
    source: 'flag' | 'eoria.json' | 'default'
    remote: boolean
    reachable: boolean
    error: string | null
  }
  /** Null without a readable `eoria.json`. */
  components: { directory: string; alias: string; exists: boolean } | null
  installed: InstalledItem[]
  packageManager: PackageManager
  expo: boolean
  /** Version ranges from `package.json`. Null when the package is not listed. */
  packages: Record<string, string | null>
}

export async function projectInfo(root: string, options: ReadOptions = {}): Promise<ProjectInfo> {
  let config: EoriaConfig | null = null
  let configError: string | null = null
  try {
    config = await readConfig(root)
  } catch (error) {
    configError = `eoria.json does not parse: ${(error as Error).message}`
  }
  const { registry, registrySource } = pickRegistry(config, options)

  let reachable = true
  let registryError: string | null = null
  try {
    await registry.index()
  } catch (error) {
    if (!(error instanceof RegistryError)) throw error
    reachable = false
    registryError = error.message
  }

  const pkg = await readPackageJson(root)
  const packages: Record<string, string | null> = {}
  for (const name of REPORTED_PACKAGES) {
    packages[name] = pkg?.dependencies?.[name] ?? pkg?.devDependencies?.[name] ?? null
  }

  const configFile = resolve(root, CONFIG_FILE)
  return {
    cli: { version: CLI_VERSION },
    root,
    config: {
      path: existsSync(configFile) ? configFile : null,
      error: configError,
      values: config
        ? { registry: config.registry, components: config.components, alias: config.alias }
        : null,
    },
    registry: {
      location: registry.base,
      source: registrySource,
      remote: registry.isRemote,
      reachable,
      error: registryError,
    },
    components: config
      ? {
          directory: config.components,
          alias: config.alias,
          exists: existsSync(resolve(root, config.components)),
        }
      : null,
    installed: config ? await installedItems(root, config, reachable ? registry : null) : [],
    packageManager: detectPackageManager(root),
    expo: await usesExpo(root),
    packages,
  }
}

/** Per-file status of every installed item, with the labels `diff` prints. */
export async function installedItems(
  root: string,
  config: EoriaConfig,
  registry: Registry | null,
): Promise<InstalledItem[]> {
  const items: InstalledItem[] = []
  for (const [name, recorded] of Object.entries(config.installed)) {
    const upstream = new Map<string, string>()
    let known = registry !== null
    try {
      const remote = await registry?.item(name)
      for (const file of remote?.files ?? []) {
        upstream.set(localPath(config.components, file), rewriteAlias(file.content, config.alias))
      }
    } catch (error) {
      if (!(error instanceof RegistryError)) throw error
      known = false
    }
    // Registry files first, as `diff` walks them, then recorded files the registry dropped.
    const paths = [...new Set([...upstream.keys(), ...Object.keys(recorded)])]
    const files: InstalledFile[] = []
    for (const path of paths) {
      const abs = resolve(root, path)
      const local = existsSync(abs) ? await readFile(abs, 'utf8') : null
      const content = upstream.get(path)
      let status: InfoFileStatus
      if (known && content !== undefined) status = fileStatus(local, content, recorded[path])
      else if (local === null) status = 'missing'
      else if (hashContent(local) !== recorded[path]) status = 'local'
      else status = 'unknown'
      files.push({
        path,
        status,
        label: status === 'unknown' ? 'not compared with the registry' : STATUS_LABELS[status],
      })
    }
    items.push({ name, files })
  }
  return items
}

export async function info(root: string, options: InfoOptions): Promise<void> {
  const result = await projectInfo(root, options)
  if (options.json) return printJson(result)

  const rows: string[][] = [
    ['cli', result.cli.version],
    ['project', result.root],
    ['eoria.json', result.config.error ?? result.config.path ?? 'none, run `eoria init`'],
    [
      'registry',
      `${result.registry.location} ${log.dim(`from ${result.registry.source}`)}${
        result.registry.reachable ? '' : ` unreachable, ${result.registry.error}`
      }`,
    ],
  ]
  if (result.components) {
    rows.push(
      [
        'components',
        `${result.components.directory}${result.components.exists ? '' : ' (folder missing)'}`,
      ],
      ['alias', result.components.alias],
    )
  }
  rows.push(['package manager', result.packageManager], ['expo', result.expo ? 'yes' : 'no'])
  for (const [name, version] of Object.entries(result.packages)) {
    rows.push([name, version ?? 'not in package.json'])
  }
  for (const line of columns(rows)) log.info(line)

  if (!result.config.values) return
  log.info('')
  if (result.installed.length === 0) {
    log.info('Nothing installed yet.')
    return
  }
  log.info(log.bold('installed'))
  const fileRows = result.installed.flatMap((item) =>
    item.files.map((file) => [item.name, file.path, file.label]),
  )
  for (const line of columns(fileRows)) log.info(`  ${line}`)
}
