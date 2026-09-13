import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { readConfig, writeConfig } from '../config'
import { hashContent, localPath, rewriteAlias } from '../files'
import { Registry } from '../registry'
import { installCommand, missingDependencies, run } from '../project'
import { CliError, log } from '../log'
import { assertPlainName } from '../files'

export interface AddOptions {
  overwrite?: boolean
  install?: boolean
  registry?: string
}

export async function add(root: string, names: string[], options: AddOptions): Promise<void> {
  const config = await readConfig(root)
  if (!config) throw new CliError('No eoria.json here. Run `npx @eoria/cli init` first.')
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
  const pulled = items.filter((item) => !names.includes(item.name)).map((item) => item.name)
  if (pulled.length > 0) log.step(`Also needed: ${pulled.join(', ')}`)

  const written: string[] = []
  const skipped: string[] = []
  const npmDeps: string[] = []

  for (const item of items) {
    const hashes: Record<string, string> = {}
    let itemWritten = false
    for (const file of item.files) {
      const target = localPath(config.components, file)
      const abs = resolve(root, target)
      const content = rewriteAlias(file.content, config.alias)
      hashes[target] = hashContent(content)

      if (existsSync(abs) && !options.overwrite) {
        const current = await readFile(abs, 'utf8')
        if (current === content) continue
        const recorded = config.installed[item.name]?.[target]
        const edited = recorded !== undefined && recorded !== hashContent(current)
        skipped.push(
          `${target} ${edited ? '(you edited it)' : '(exists)'}. Pass --overwrite to replace it.`,
        )
        // Keep whatever was recorded before; never claim a hash for content not on disk.
        if (recorded !== undefined) hashes[target] = recorded
        else delete hashes[target]
        continue
      }
      await mkdir(dirname(abs), { recursive: true })
      await writeFile(abs, content)
      written.push(target)
      itemWritten = true
    }
    if ((itemWritten || !config.installed[item.name]) && Object.keys(hashes).length > 0) {
      config.installed[item.name] = hashes
    }
    npmDeps.push(...(item.dependencies ?? []))
  }

  await writeConfig(root, config)
  for (const file of written) log.ok(file)
  for (const line of skipped) log.warn(line)

  const missing = await missingDependencies(root, npmDeps)
  if (missing.length > 0) {
    const command = await installCommand(root, missing)
    if (options.install === false) {
      log.step(`Install the packages these need:\n  ${command.join(' ')}`)
    } else {
      log.step(command.join(' '))
      const code = await run(command, root)
      if (code !== 0) log.warn(`Install exited with ${code}. Run it again by hand.`)
    }
  }
}
