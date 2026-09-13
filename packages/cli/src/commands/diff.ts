import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import pc from 'picocolors'
import { readConfig } from '../config'
import { diffLines, formatDiff } from '../diff'
import { hashContent, localPath, rewriteAlias } from '../files'
import { Registry } from '../registry'
import { CliError, log } from '../log'

export interface DiffOptions {
  registry?: string
  full?: boolean
}

interface FileReport {
  target: string
  status: 'unchanged' | 'upstream' | 'local' | 'both' | 'missing'
  lines: string[]
}

export async function diff(root: string, name: string | undefined, options: DiffOptions) {
  const config = await readConfig(root)
  if (!config) throw new CliError('No eoria.json here. Run `npx @eoria/cli init` first.')
  const names = name ? [name] : Object.keys(config.installed)
  if (names.length === 0) {
    log.info('Nothing installed yet.')
    return
  }
  const registry = new Registry(options.registry ?? config.registry)
  const derived = await findDerived(root, config.components, config.alias)
  let changed = 0

  for (const item of names) {
    if (!config.installed[item]) throw new CliError(`${item} is not installed.`)
    const remote = await registry.item(item)
    const reports: FileReport[] = []
    for (const file of remote.files) {
      const target = localPath(config.components, file)
      const abs = resolve(root, target)
      const upstream = rewriteAlias(file.content, config.alias)
      if (!existsSync(abs)) {
        reports.push({ target, status: 'missing', lines: [] })
        continue
      }
      const local = await readFile(abs, 'utf8')
      const recorded = config.installed[item]?.[target]
      const localEdited = recorded !== undefined && hashContent(local) !== recorded
      const upstreamChanged = recorded !== undefined && hashContent(upstream) !== recorded
      const status =
        !localEdited && !upstreamChanged
          ? local === upstream
            ? 'unchanged'
            : 'upstream'
          : localEdited && upstreamChanged
            ? 'both'
            : localEdited
              ? 'local'
              : 'upstream'
      const lines =
        status === 'unchanged' ? [] : formatDiff(diffLines(local, upstream), options.full ? 1e9 : 2)
      reports.push({ target, status, lines })
    }

    const worst = reports.find((r) => r.status !== 'unchanged')
    if (!worst) {
      log.ok(`${item} ${log.dim('up to date')}`)
      continue
    }
    changed++
    for (const report of reports) {
      if (report.status === 'unchanged') continue
      const label = {
        upstream: 'registry changed',
        local: 'edited locally',
        both: 'edited locally and changed in the registry',
        missing: 'file missing',
      }[report.status]
      log.warn(`${item} ${log.dim(report.target)} ${pc.yellow(label)}`)
      for (const line of report.lines) {
        console.log(
          line.startsWith('+')
            ? pc.green(line)
            : line.startsWith('-')
              ? pc.red(line)
              : log.dim(line),
        )
      }
    }
    const dependants = derived.get(item)
    if (dependants && dependants.length > 0 && worst.status !== 'local') {
      log.warn(
        `Derived from ${item}: ${dependants.join(', ')}. They inherit the change through extendSlotRecipe.`,
      )
    }
  }
  if (changed === 0) log.ok('Everything matches the registry.')
}

/** Local files that import a registry item but are not registry items themselves. */
async function findDerived(root: string, componentsDir: string, alias: string) {
  const dir = resolve(root, componentsDir)
  const result = new Map<string, string[]>()
  if (!existsSync(dir)) return result
  const files = (await readdir(dir)).filter((f) => /\.tsx?$/.test(f))
  for (const file of files) {
    const text = await readFile(resolve(dir, file), 'utf8')
    const imports = [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!)
    for (const spec of imports) {
      let base: string | undefined
      if (spec.startsWith(`${alias}/`)) base = spec.slice(alias.length + 1)
      else if (spec.startsWith('./')) base = spec.slice(2)
      if (!base) continue
      base = basename(base).replace(/\.tsx?$/, '')
      if (base === file.replace(/\.tsx?$/, '')) continue
      const list = result.get(base) ?? []
      list.push(file)
      result.set(base, list)
    }
  }
  return result
}
