import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pc from 'picocolors'
import { CONFIG_FILE, readConfig, type EoriaConfig } from '../config'
import { pickRegistry, type ReadOptions } from '../context'
import { log } from '../log'
import { printJson, reserveStdout } from '../print'
import { missingDependencies } from '../project'
import { RegistryError, type RegistryItem } from '../registry'
import {
  BABEL_CONFIG,
  REQUIRED_PACKAGES,
  UNISTYLES_PLUGIN,
  WORKLETS_PLUGIN,
  aliasHint,
  aliasPrefix,
  aliasState,
  babelState,
  ensureAlias,
  ensureUnistylesFile,
  findEntryFile,
  importsUnistyles,
  installPackages,
  sourceRoot,
  themeImportHint,
} from '../setup'

export interface DoctorOptions extends ReadOptions {
  json?: boolean
  fix?: boolean
}

export type CheckStatus = 'pass' | 'warn' | 'fail'

export type CheckId =
  | 'config'
  | 'registry'
  | 'components-folder'
  | 'alias'
  | 'unistyles-file'
  | 'theme-import'
  | 'babel'
  | 'peers'
  | 'installed-files'
  | 'registry-dependencies'
  | 'npm-dependencies'

export interface DoctorCheck {
  id: CheckId
  status: CheckStatus
  /** What doctor found. */
  message: string
  /** What to do about it. Null on a pass. */
  remedy: string | null
  /** Whether `--fix` repairs it. */
  fixable: boolean
}

export interface DoctorReport {
  /** False when any check failed. Warnings do not count. */
  ok: boolean
  root: string
  checks: DoctorCheck[]
  /** Ids of the checks `--fix` acted on in this run. */
  fixed: CheckId[]
  summary: Record<CheckStatus, number>
}

const pass = (id: CheckId, message: string): DoctorCheck => ({
  id,
  status: 'pass',
  message,
  remedy: null,
  fixable: false,
})

const problem = (
  status: 'warn' | 'fail',
  id: CheckId,
  message: string,
  remedy: string,
  fixable = false,
): DoctorCheck => ({ id, status, message, remedy, fixable })

/** The checks, plus what `--fix` needs to act on them. */
interface Findings {
  checks: DoctorCheck[]
  config: EoriaConfig | null
  srcRoot: string
  missingPackages: string[]
}

async function inspect(root: string, options: ReadOptions): Promise<Findings> {
  const checks: DoctorCheck[] = []
  const findings: Findings = { checks, config: null, srcRoot: 'src', missingPackages: [] }

  let config: EoriaConfig | null
  try {
    config = await readConfig(root)
  } catch (error) {
    checks.push(
      problem(
        'fail',
        'config',
        `${CONFIG_FILE} does not parse: ${(error as Error).message}`,
        `Fix the JSON in ${CONFIG_FILE}, or delete it and run \`eoria init\`.`,
      ),
    )
    return findings
  }
  if (!config) {
    checks.push(
      problem('fail', 'config', `No ${CONFIG_FILE} in ${root}.`, 'Run `npx @eoria/cli init`.'),
    )
    return findings
  }
  findings.config = config
  checks.push(pass('config', `${CONFIG_FILE} parses.`))

  const { registry } = pickRegistry(config, options)
  let reachable = true
  try {
    await registry.index()
    checks.push(pass('registry', `${registry.base} answers.`))
  } catch (error) {
    if (!(error instanceof RegistryError)) throw error
    reachable = false
    checks.push(
      problem(
        'fail',
        'registry',
        error.message,
        `Check \`registry\` in ${CONFIG_FILE} and your connection, or pass --registry.`,
      ),
    )
  }

  checks.push(
    existsSync(resolve(root, config.components))
      ? pass('components-folder', `${config.components} exists.`)
      : problem(
          'fail',
          'components-folder',
          `${config.components} does not exist.`,
          `Create it, run \`eoria add\`, or point \`components\` in ${CONFIG_FILE} at the right folder.`,
        ),
  )

  const prefix = aliasPrefix(config.alias)
  const alias = await aliasState(root, config)
  if (alias === 'present') {
    checks.push(pass('alias', `tsconfig.json has a "${prefix}/*" path.`))
  } else if (alias === 'not-needed') {
    checks.push(pass('alias', `The alias ${config.alias} needs no tsconfig path.`))
  } else if (alias === 'no-tsconfig') {
    checks.push(
      problem(
        'warn',
        'alias',
        'There is no tsconfig.json to hold the path alias.',
        `Make sure your bundler resolves ${config.alias}.`,
      ),
    )
  } else {
    checks.push(
      problem(
        'fail',
        'alias',
        `tsconfig.json has no "${prefix}/*" path, so ${config.alias} does not resolve.`,
        `Run \`eoria doctor --fix\`, or add ${aliasHint(config)} to compilerOptions.paths.`,
        true,
      ),
    )
  }

  const srcRoot = await sourceRoot(root, config)
  findings.srcRoot = srcRoot
  const unistylesFile = `${srcRoot}/unistyles.ts`
  checks.push(
    existsSync(resolve(root, unistylesFile))
      ? pass('unistyles-file', `${unistylesFile} exists.`)
      : problem(
          'fail',
          'unistyles-file',
          `${unistylesFile} does not exist, so no theme is registered.`,
          'Run `eoria doctor --fix` to write it.',
          true,
        ),
  )

  const entry = findEntryFile(root, srcRoot)
  if (!entry) {
    checks.push(
      problem(
        'warn',
        'theme-import',
        'Could not find your root layout.',
        `Make sure ${themeImportHint(config)} is the first import of your entry file.`,
      ),
    )
  } else if (importsUnistyles(await readFile(resolve(root, entry), 'utf8'))) {
    checks.push(pass('theme-import', `${entry} imports unistyles.`))
  } else {
    checks.push(
      problem(
        'fail',
        'theme-import',
        `${entry} does not import unistyles, so Unistyles throws on the first component.`,
        `Add ${themeImportHint(config)} as its first import, or run \`eoria init --yes\`.`,
      ),
    )
  }

  const babel = await babelState(root)
  const pluginLines = `['${UNISTYLES_PLUGIN}', { root: '${srcRoot}' }] and '${WORKLETS_PLUGIN}'`
  if (!babel.exists) {
    checks.push(
      problem(
        'fail',
        'babel',
        `There is no ${BABEL_CONFIG}, so neither Babel plugin runs.`,
        'Run `eoria init --yes` to write it. Existing files are kept.',
      ),
    )
  } else if (!babel.unistyles || !babel.worklets) {
    const absent = [
      ...(babel.unistyles ? [] : [UNISTYLES_PLUGIN]),
      ...(babel.worklets ? [] : [WORKLETS_PLUGIN]),
    ]
    checks.push(
      problem(
        'fail',
        'babel',
        `${BABEL_CONFIG} does not list ${absent.join(' or ')}.`,
        `Add ${pluginLines} to its plugins, with the Worklets plugin last.`,
      ),
    )
  } else if (babel.workletsLast === false) {
    checks.push(
      problem(
        'warn',
        'babel',
        `${WORKLETS_PLUGIN} is not the last plugin in ${BABEL_CONFIG}.`,
        'Move it to the end of the plugins array. Reanimated asks for that order.',
      ),
    )
  } else {
    checks.push(pass('babel', `${BABEL_CONFIG} lists the Unistyles and Worklets plugins.`))
  }

  const missingPeers = await missingDependencies(root, REQUIRED_PACKAGES)
  findings.missingPackages.push(...missingPeers)
  checks.push(
    missingPeers.length === 0
      ? pass('peers', 'package.json lists @eoria/core and every peer.')
      : problem(
          'fail',
          'peers',
          `package.json does not list ${missingPeers.join(', ')}.`,
          'Run `eoria doctor --fix` to install them.',
          true,
        ),
  )

  const names = Object.keys(config.installed)
  const goneFiles = names.flatMap((name) =>
    Object.keys(config.installed[name] ?? {}).filter((path) => !existsSync(resolve(root, path))),
  )
  checks.push(
    goneFiles.length === 0
      ? pass('installed-files', `Every file of the ${names.length} installed items exists.`)
      : problem(
          'fail',
          'installed-files',
          `Missing: ${goneFiles.join(', ')}.`,
          'Run `eoria add <name>` again to restore them.',
        ),
  )

  const items: RegistryItem[] = []
  const unknown: string[] = []
  if (reachable) {
    for (const name of names) {
      try {
        items.push(await registry.item(name))
      } catch (error) {
        if (!(error instanceof RegistryError)) throw error
        unknown.push(name)
      }
    }
  }
  const skipped = !reachable
    ? 'The registry did not answer, so this was not checked.'
    : unknown.length > 0
      ? `The registry has no ${unknown.join(', ')}, so those were not checked.`
      : null

  const missingItems = [
    ...new Set(items.flatMap((item) => item.registryDependencies ?? [])),
  ].filter((name) => !(name in config.installed))
  if (missingItems.length > 0) {
    checks.push(
      problem(
        'fail',
        'registry-dependencies',
        `Installed items import ${missingItems.join(', ')}, which eoria.json does not list.`,
        `Run \`eoria add ${missingItems.join(' ')}\`.`,
      ),
    )
  } else if (skipped) {
    checks.push(
      problem('warn', 'registry-dependencies', skipped, 'Run doctor again with the registry up.'),
    )
  } else {
    checks.push(pass('registry-dependencies', 'Every registry dependency is installed.'))
  }

  const missingNpm = (
    await missingDependencies(
      root,
      items.flatMap((item) => item.dependencies ?? []),
    )
  ).filter((name) => !findings.missingPackages.includes(name))
  findings.missingPackages.push(...missingNpm)
  if (missingNpm.length > 0) {
    checks.push(
      problem(
        'fail',
        'npm-dependencies',
        `Installed items need ${missingNpm.join(', ')}, which package.json does not list.`,
        'Run `eoria doctor --fix` to install them.',
        true,
      ),
    )
  } else if (skipped) {
    checks.push(
      problem('warn', 'npm-dependencies', skipped, 'Run doctor again with the registry up.'),
    )
  } else {
    checks.push(pass('npm-dependencies', 'package.json lists every package the items declare.'))
  }

  return findings
}

/**
 * Checks the project against what `init` and `add` set up. With `fix`, it adds the path alias,
 * writes a missing `unistyles.ts` and installs missing packages through the functions `init`
 * uses, then checks again and reports the second pass.
 */
export async function runDoctor(
  root: string,
  options: ReadOptions & { fix?: boolean } = {},
): Promise<DoctorReport> {
  let findings = await inspect(root, options)
  let fixed: CheckId[] = []

  if (options.fix && findings.config) {
    const broken = findings.checks.filter((check) => check.fixable && check.status === 'fail')
    for (const check of broken) {
      if (check.id === 'alias') await ensureAlias(root, findings.config)
      if (check.id === 'unistyles-file') await ensureUnistylesFile(root, findings.srcRoot)
    }
    if (findings.missingPackages.length > 0) {
      await installPackages(root, findings.missingPackages)
    }
    if (broken.length > 0) {
      findings = await inspect(root, options)
      // A fix counts only when the second pass agrees, so a failed install is not claimed.
      const passing = new Set(
        findings.checks.filter((check) => check.status === 'pass').map((check) => check.id),
      )
      fixed = broken.map((check) => check.id).filter((id) => passing.has(id))
    }
  }

  const summary: Record<CheckStatus, number> = { pass: 0, warn: 0, fail: 0 }
  for (const check of findings.checks) summary[check.status]++
  return { ok: summary.fail === 0, root, checks: findings.checks, fixed, summary }
}

export async function doctor(root: string, options: DoctorOptions): Promise<void> {
  if (options.json) reserveStdout()
  const report = await runDoctor(root, options)
  if (!report.ok) process.exitCode = 1
  if (options.json) return printJson(report)

  if (options.fix) log.info('')
  const mark = { pass: pc.green('✓'), warn: pc.yellow('!'), fail: pc.red('✗') }
  for (const check of report.checks) {
    console.log(`${mark[check.status]} ${check.message}`)
    if (check.remedy) console.log(`  ${log.dim(check.remedy)}`)
  }
  const { pass: passed, warn, fail } = report.summary
  log.info('')
  log.info(`${passed} passed, ${warn} warnings, ${fail} failed.`)
}
