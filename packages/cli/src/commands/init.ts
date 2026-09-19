import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  configFromShadcn,
  defaultConfig,
  readConfig,
  writeConfig,
  type EoriaConfig,
} from '../config'
import { installCommand, missingDependencies } from '../project'
import { log } from '../log'
import {
  REQUIRED_PACKAGES,
  ensureAlias,
  ensureBabelConfig,
  ensureThemeImport,
  ensureUnistylesFile,
  installPackages,
  sourceRoot,
} from '../setup'

export { PEERS, ensureThemeImport } from '../setup'

export interface InitOptions {
  registry?: string
  dir?: string
  alias?: string
  yes?: boolean
  install?: boolean
}

export async function init(root: string, options: InitOptions): Promise<void> {
  const existing = await readConfig(root)
  if (existing && !options.yes) {
    log.warn('eoria.json already exists. Pass --yes to run init again; existing files are kept.')
    return
  }
  const seed = existing ?? (await configFromShadcn(root)) ?? {}
  if (!existing && seed.alias) log.step(`Using aliases from components.json (${seed.alias})`)

  const config: EoriaConfig = {
    ...defaultConfig,
    ...seed,
    installed: existing?.installed ?? {},
  }
  if (options.registry) config.registry = options.registry
  if (options.dir) config.components = options.dir
  if (options.alias) config.alias = options.alias
  await writeConfig(root, config)
  log.ok(`Wrote eoria.json (${config.components}, alias ${config.alias})`)

  await mkdir(resolve(root, config.components), { recursive: true })
  const srcRoot = await sourceRoot(root, config)

  await ensureUnistylesFile(root, srcRoot)
  await ensureThemeImport(root, srcRoot, config)
  await ensureBabelConfig(root, srcRoot)
  await ensureAlias(root, config)

  const missing = await missingDependencies(root, REQUIRED_PACKAGES)
  if (missing.length === 0) {
    log.ok('All peer dependencies are installed.')
  } else if (options.install === false) {
    log.step(`Install the peers when ready:\n  ${(await installCommand(root, missing)).join(' ')}`)
  } else {
    await installPackages(root, missing)
  }

  log.info('')
  log.info(
    `Next: ${log.bold('npx @eoria/cli add button')}, then mount <PortalHost /> and <Toaster /> in your root layout.`,
  )
  log.info(log.dim('Full steps: https://eoria.adamtrip.pt/start/installation/'))
}
