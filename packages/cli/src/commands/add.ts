import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { readConfig, writeConfig, type EoriaConfig } from '../config'
import { diffLines, formatDiff } from '../diff'
import { assertPlainName, hashContent, localPath, rewriteAlias } from '../files'
import { Registry } from '../registry'
import { installCommand, missingDependencies } from '../project'
import { CliError, log } from '../log'
import { printDiff, printFileStatus } from '../print'
import { installPackages } from '../setup'
import { fileStatus } from '../status'

export interface AddOptions {
  overwrite?: boolean
  install?: boolean
  registry?: string
  dryRun?: boolean
  diff?: boolean
}

export interface PlannedFile {
  item: string
  /** Path relative to the project root. */
  target: string
  /**
   * `write` creates the file. `overwrite` replaces it, which needs `--overwrite`. `skip` leaves
   * a file that differs from the registry alone. `same` means the file already matches.
   */
  action: 'write' | 'overwrite' | 'skip' | 'same'
  /** True when the file no longer matches the hash `add` recorded for it. */
  edited: boolean
  /** Registry content after the alias rewrite. */
  content: string
  /** What is on disk now, or null when the file does not exist. */
  current: string | null
}

export interface AddPlan {
  /** Every item `add` would handle, dependencies first. */
  items: string[]
  /** Items pulled in through `registryDependencies` that were not named. */
  pulled: string[]
  files: PlannedFile[]
  /** npm packages the items declare that `package.json` does not list. */
  missingPackages: string[]
  /** The command that installs `missingPackages`, or null when nothing is missing. */
  installCommand: string[] | null
}

/** Resolves everything `add` would do, reading the registry and the disk and writing nothing. */
export async function planAdd(
  root: string,
  config: EoriaConfig,
  names: string[],
  options: Pick<AddOptions, 'overwrite' | 'registry'> = {},
): Promise<AddPlan> {
  if (names.length === 0)
    throw new CliError('Name at least one component, e.g. `eoria add button`.')

  for (const name of names) {
    try {
      assertPlainName(name, 'component')
    } catch (error) {
      throw new CliError((error as Error).message)
    }
  }
  const registry = new Registry(options.registry ?? config.registry)
  const items = await registry.resolve(names)
  const files: PlannedFile[] = []
  for (const item of items) {
    for (const file of item.files) {
      const target = localPath(config.components, file)
      const abs = resolve(root, target)
      const content = rewriteAlias(file.content, config.alias)
      const current = existsSync(abs) ? await readFile(abs, 'utf8') : null
      const recorded = config.installed[item.name]?.[target]
      const action =
        current === null
          ? 'write'
          : options.overwrite
            ? 'overwrite'
            : current === content
              ? 'same'
              : 'skip'
      const edited = current !== null && recorded !== undefined && recorded !== hashContent(current)
      files.push({ item: item.name, target, action, edited, content, current })
    }
  }
  const missingPackages = await missingDependencies(
    root,
    items.flatMap((item) => item.dependencies ?? []),
  )
  return {
    items: items.map((item) => item.name),
    pulled: items.filter((item) => !names.includes(item.name)).map((item) => item.name),
    files,
    missingPackages,
    installCommand: missingPackages.length > 0 ? await installCommand(root, missingPackages) : null,
  }
}

export interface WrittenPlan {
  /** Targets of the files that were created or replaced. */
  written: string[]
  /** Files that exist, differ from the registry and were left alone. */
  skipped: PlannedFile[]
}

/**
 * Writes the files of a plan and records their hashes in `eoria.json`. Prints nothing and
 * installs nothing, so `add` and the MCP server can share it.
 */
export async function writePlan(
  root: string,
  config: EoriaConfig,
  plan: AddPlan,
): Promise<WrittenPlan> {
  const written: string[] = []
  const skipped: PlannedFile[] = []

  for (const item of plan.items) {
    const hashes: Record<string, string> = {}
    let itemWritten = false
    for (const file of plan.files.filter((planned) => planned.item === item)) {
      hashes[file.target] = hashContent(file.content)
      if (file.action === 'same') continue
      if (file.action === 'skip') {
        skipped.push(file)
        // Keep whatever was recorded before; never claim a hash for content not on disk.
        const recorded = config.installed[item]?.[file.target]
        if (recorded !== undefined) hashes[file.target] = recorded
        else delete hashes[file.target]
        continue
      }
      const abs = resolve(root, file.target)
      await mkdir(dirname(abs), { recursive: true })
      await writeFile(abs, file.content)
      written.push(file.target)
      itemWritten = true
    }
    if ((itemWritten || !config.installed[item]) && Object.keys(hashes).length > 0) {
      config.installed[item] = hashes
    }
  }

  await writeConfig(root, config)
  return { written, skipped }
}

export async function add(root: string, names: string[], options: AddOptions): Promise<void> {
  const config = await readConfig(root)
  if (!config) throw new CliError('No eoria.json here. Run `npx @eoria/cli init` first.')
  const plan = await planAdd(root, config, names, options)
  if (plan.pulled.length > 0) log.step(`Also needed: ${plan.pulled.join(', ')}`)
  if (options.diff) return printAddDiff(config, plan)
  if (options.dryRun) return printDryRun(plan, options)

  const { written, skipped } = await writePlan(root, config, plan)
  for (const file of written) log.ok(file)
  for (const file of skipped) log.warn(skipMessage(file))

  if (plan.installCommand) {
    if (options.install === false) {
      log.step(`Install the packages these need:\n  ${plan.installCommand.join(' ')}`)
    } else {
      await installPackages(root, plan.missingPackages)
    }
  }
}

function skipMessage(file: PlannedFile): string {
  return `${file.target} ${file.edited ? '(you edited it)' : '(exists)'}. Pass --overwrite to replace it.`
}

/** Prints the plan for `--dry-run`. */
function printDryRun(plan: AddPlan, options: AddOptions): void {
  for (const file of plan.files) {
    if (file.action === 'write') log.step(`would write ${file.target}`)
    if (file.action === 'overwrite') {
      log.step(`would overwrite ${file.target}${file.edited ? ' (you edited it)' : ''}`)
    }
    if (file.action === 'skip') log.warn(`would skip ${skipMessage(file)}`)
    if (file.action === 'same')
      log.step(`${file.target} ${log.dim('already matches the registry')}`)
  }
  if (plan.installCommand) {
    log.step(
      `${options.install === false ? 'would print' : 'would run'} ${plan.installCommand.join(' ')}`,
    )
  }
  log.info(log.dim('Dry run. Nothing was written.'))
}

/** For `--diff`. Prints the hunks between each file on disk and its registry file. */
function printAddDiff(config: EoriaConfig, plan: AddPlan): void {
  for (const file of plan.files) {
    if (file.current === null) {
      log.step(`${file.item} ${log.dim(file.target)} new file`)
      continue
    }
    const recorded = config.installed[file.item]?.[file.target]
    const status = fileStatus(file.current, file.content, recorded)
    if (status === 'unchanged') {
      log.ok(`${file.item} ${log.dim(file.target)} ${log.dim('up to date')}`)
      continue
    }
    printFileStatus(file.item, file.target, status)
    printDiff(formatDiff(diffLines(file.current, file.content)))
  }
  log.info(log.dim('Nothing was written.'))
}
