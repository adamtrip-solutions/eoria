import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { aliasToDirectory, type EoriaConfig } from './config'
import { installCommand, readPackageJson, run } from './project'
import { CliError, log } from './log'

/**
 * What `init` sets up, split into a question and an action for each piece. `init` runs the
 * actions. `doctor` asks the questions and runs the same actions under `--fix`.
 */

export const PEERS = [
  'react-native-unistyles',
  'react-native-nitro-modules',
  'react-native-edge-to-edge',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-svg',
  'lucide-react-native',
]

/** Everything `init` installs. */
export const REQUIRED_PACKAGES = ['@eoria/core', ...PEERS]

export const BABEL_CONFIG = 'babel.config.js'
export const UNISTYLES_PLUGIN = 'react-native-unistyles/plugin'
export const WORKLETS_PLUGIN = 'react-native-worklets/plugin'

const UNISTYLES_FILE = `import { configureUnistyles, defaultThemes, type EoriaTheme } from '@eoria/core'

declare module 'react-native-unistyles' {
  export interface UnistylesThemes {
    light: EoriaTheme
    dark: EoriaTheme
  }
}

configureUnistyles({ themes: defaultThemes })
`

const BABEL_FILE = (root: string) => `module.exports = (api) => {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [['${UNISTYLES_PLUGIN}', { root: '${root}' }], '${WORKLETS_PLUGIN}'],
  }
}
`

/** Entry files, in the order Expo Router and bare React Native look for them. */
const ENTRY_FILES = [
  'app/_layout.tsx',
  'app/_layout.jsx',
  'app/_layout.js',
  'App.tsx',
  'App.jsx',
  'App.js',
  'index.tsx',
  'index.js',
]

/** `@` for `@/components/ui`, `~` for `~/ui`, nothing for an alias without a prefix. */
export function aliasPrefix(alias: string): string | undefined {
  return /^(@[^/]*|~)\//.exec(alias)?.[1]
}

/**
 * The folder the `@/` alias points at, from tsconfig `paths`. That is where
 * `unistyles.ts` goes and what the Unistyles Babel plugin should scope to.
 */
export async function sourceRoot(root: string, config: EoriaConfig): Promise<string> {
  const prefix = aliasPrefix(config.alias)
  if (!prefix) return config.components.split('/')[0] || 'src'
  const dir = (await aliasToDirectory(root, `${prefix}/x`)).replace(/\/?x$/, '')
  return dir === '' ? '.' : dir
}

/** The root layout or entry file, relative to the project root. */
export function findEntryFile(root: string, srcRoot: string): string | undefined {
  const candidates = ENTRY_FILES.flatMap((f) => (srcRoot === '.' ? [f] : [`${srcRoot}/${f}`, f]))
  return candidates.find((f) => existsSync(resolve(root, f)))
}

export function importsUnistyles(text: string): boolean {
  return (
    /^\s*import\s+['"][^'"]*\/unistyles['"]/m.test(text) ||
    /from\s+['"][^'"]*\/unistyles['"]/.test(text)
  )
}

/** The import `ensureThemeImport` writes when the alias has a prefix. */
export function themeImportHint(config: EoriaConfig): string {
  const prefix = aliasPrefix(config.alias)
  return `import '${prefix ? `${prefix}/unistyles` : './unistyles'}'`
}

/** Writes `unistyles.ts` under the source root unless it exists. Returns the path it wrote. */
export async function ensureUnistylesFile(
  root: string,
  srcRoot: string,
): Promise<string | undefined> {
  const unistyles = resolve(root, srcRoot, 'unistyles.ts')
  if (existsSync(unistyles)) {
    log.step(`${srcRoot}/unistyles.ts exists, left as is.`)
    return undefined
  }
  await mkdir(dirname(unistyles), { recursive: true })
  await writeFile(unistyles, UNISTYLES_FILE)
  log.ok(`Wrote ${srcRoot}/unistyles.ts.`)
  return `${srcRoot}/unistyles.ts`
}

/**
 * Prepends `import '@/unistyles'` to the root layout so the themes register
 * before any stylesheet is created. Without it Unistyles throws on the first
 * component. Reports when no entry file can be found. Returns the file it changed.
 */
export async function ensureThemeImport(
  root: string,
  srcRoot: string,
  config: EoriaConfig,
): Promise<string | undefined> {
  const prefix = aliasPrefix(config.alias)
  const entry = findEntryFile(root, srcRoot)
  if (!entry) {
    log.warn(
      `Could not find your root layout. Add ${log.bold(themeImportHint(config))} as the first import of your entry file.`,
    )
    return undefined
  }
  const file = resolve(root, entry)
  const text = await readFile(file, 'utf8')
  if (importsUnistyles(text)) {
    log.step(`${entry} already imports unistyles.`)
    return undefined
  }
  let specifier: string
  if (prefix) {
    specifier = `${prefix}/unistyles`
  } else {
    const rel = relative(dirname(file), resolve(root, srcRoot, 'unistyles'))
      .split('\\')
      .join('/')
    specifier = rel.startsWith('.') ? rel : `./${rel}`
  }
  const quote = text.includes('"') && !text.includes("'") ? '"' : "'"
  const semi = /;\s*$/m.test(text) ? ';' : ''
  await writeFile(file, `import ${quote}${specifier}${quote}${semi}\n${text}`)
  log.ok(`Added import '${specifier}' to ${entry}. It must stay the first import.`)
  return entry
}

export interface BabelState {
  exists: boolean
  unistyles: boolean
  worklets: boolean
  /**
   * Whether the Worklets plugin closes the `plugins` array, which Reanimated asks for and
   * what `init` writes. Null when the plugin is absent or the array cannot be read.
   */
  workletsLast: boolean | null
  /**
   * Whether `babel-preset-expo` adds the Worklets plugin itself. From Expo SDK 54 it does when
   * `react-native-worklets` is installed, unless its options say `worklets: false` or
   * `reanimated: false`. Babel runs preset plugins after the config's own, so it comes last.
   * False whenever the config or the Expo version cannot be read with confidence.
   */
  presetWorklets: boolean
}

export async function babelState(root: string): Promise<BabelState> {
  const file = resolve(root, BABEL_CONFIG)
  if (!existsSync(file)) {
    return {
      exists: false,
      unistyles: false,
      worklets: false,
      workletsLast: null,
      presetWorklets: false,
    }
  }
  const text = stripComments(await readFile(file, 'utf8'))
  const worklets = text.includes(WORKLETS_PLUGIN)
  const last = worklets ? (arrayAt(text, 'plugins')?.at(-1) ?? null) : null
  return {
    exists: true,
    unistyles: text.includes(UNISTYLES_PLUGIN),
    worklets,
    workletsLast: last === null ? null : last.includes(WORKLETS_PLUGIN),
    presetWorklets: expoPresetKeepsWorklets(text) && ((await expoMajor(root)) ?? 0) >= 54,
  }
}

const EXPO_PRESET = /^(['"])(babel-preset-)?expo\1$/

/**
 * Whether the `presets` array lists babel-preset-expo with options that leave its Worklets
 * plugin on. Options are read from that entry only, including the `native` and `web` objects
 * the preset merges in. Anything it cannot read, such as a variable or a spread, counts as no.
 */
function expoPresetKeepsWorklets(text: string): boolean {
  for (const element of arrayAt(text, 'presets') ?? []) {
    const entry = element.trim()
    if (EXPO_PRESET.test(entry)) return true
    if (!entry.startsWith('[')) continue
    const [name, options] = listElements(entry, 1) ?? []
    if (name === undefined || !EXPO_PRESET.test(name.trim())) continue
    return options === undefined || optionsKeepWorklets(options.trim())
  }
  return false
}

function optionsKeepWorklets(options: string): boolean {
  if (!options.startsWith('{')) return false
  const properties = listElements(options, 1)
  if (!properties) return false
  return properties.every((property) => {
    const match = /^\s*(['"]?)([\w$-]+)\1\s*:([\s\S]*)$/.exec(property)
    if (!match) return false
    const key = match[2]!
    const value = match[3]!.trim()
    if (key === 'worklets' || key === 'reanimated') return value === 'true'
    if (key === 'native' || key === 'web') return optionsKeepWorklets(value)
    return true
  })
}

/**
 * Major version of the `expo` that resolves from the project, or of the range `package.json`
 * declares when none is installed. Since SDK 54 `babel-preset-expo` shares that major. Reading
 * `expo` rather than the preset works under pnpm, where only direct dependencies resolve.
 */
async function expoMajor(root: string): Promise<number | null> {
  let version: string | undefined
  for (let dir = root; ; dir = dirname(dir)) {
    const file = resolve(dir, 'node_modules/expo/package.json')
    if (existsSync(file)) {
      version = (JSON.parse(await readFile(file, 'utf8')) as { version?: string }).version
      break
    }
    if (dirname(dir) === dir) break
  }
  if (version !== undefined) {
    const major = /^(\d+)\./.exec(version)?.[1]
    return major === undefined ? null : Number(major)
  }
  // A declared range counts only when it is one simple range: its lower bound is then the
  // lowest SDK it allows. `<54` or `^54 || ^53` say nothing certain.
  const range = (await readPackageJson(root))?.dependencies?.expo ?? ''
  const major = /^\s*(?:\^|~|>=|=)?\s*v?(\d+)(?:\.(?:\d+|x|\*)){0,2}\s*$/.exec(range)?.[1]
  return major === undefined ? null : Number(major)
}

/** The source without comments. Strings are kept as they are. */
function stripComments(source: string): string {
  let out = ''
  let quote: string | null = null
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!
    if (quote) {
      out += char
      if (char === '\\') out += source[++i] ?? ''
      else if (char === quote) quote = null
      continue
    }
    if (char === '/' && source[i + 1] === '/') {
      while (i + 1 < source.length && source[i + 1] !== '\n') i++
      continue
    }
    if (char === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2)
      i = close === -1 ? source.length : close + 1
      out += ' '
      continue
    }
    if (char === '"' || char === "'" || char === '`') quote = char
    out += char
  }
  return out
}

/** Elements of the first `key: [...]` array, as source text, or null. */
function arrayAt(text: string, key: string): string[] | null {
  const start = new RegExp(`(['"]?)\\b${key}\\1\\s*:\\s*\\[`).exec(text)
  return start ? listElements(text, start.index + start[0].length) : null
}

/**
 * The comma-separated elements of the array or object whose contents start at `start`, up to
 * its closing bracket, as source text. Null when it never closes.
 */
function listElements(text: string, start: number): string[] | null {
  const elements: string[] = []
  let depth = 0
  let quote: string | null = null
  let current = ''
  for (let i = start; i < text.length; i++) {
    const char = text[i]!
    if (quote) {
      current += char
      if (char === '\\') current += text[++i] ?? ''
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') quote = char
    if (char === '[' || char === '{' || char === '(') depth++
    if (char === ']' || char === '}' || char === ')') {
      if (depth === 0) {
        if (current.trim()) elements.push(current)
        return elements
      }
      depth--
    }
    if (char === ',' && depth === 0) {
      if (current.trim()) elements.push(current)
      current = ''
      continue
    }
    current += char
  }
  return null
}

/**
 * Writes `babel.config.js` when there is none and returns its name. Otherwise says which
 * plugins to paste.
 */
export async function ensureBabelConfig(
  root: string,
  srcRoot: string,
): Promise<string | undefined> {
  const state = await babelState(root)
  if (!state.exists) {
    await writeFile(resolve(root, BABEL_CONFIG), BABEL_FILE(srcRoot))
    log.ok('Wrote babel.config.js with the Unistyles and Worklets plugins.')
    return BABEL_CONFIG
  }
  if (!state.unistyles) {
    log.warn(
      `babel.config.js exists. Add ['${UNISTYLES_PLUGIN}', { root: '${srcRoot}' }] and '${WORKLETS_PLUGIN}' to its plugins.`,
    )
  }
  return undefined
}

export type AliasState =
  /** The alias has no `@` or `~` prefix, so tsconfig `paths` does not come into it. */
  'not-needed' | 'no-tsconfig' | 'present' | 'missing'

export async function aliasState(root: string, config: EoriaConfig): Promise<AliasState> {
  const prefix = aliasPrefix(config.alias)
  if (!prefix) return 'not-needed'
  const file = resolve(root, 'tsconfig.json')
  if (!existsSync(file)) return 'no-tsconfig'
  const text = await readFile(file, 'utf8')
  return text.includes(`"${prefix}/*"`) ? 'present' : 'missing'
}

/** The `paths` entry `ensureAlias` writes, for messages. */
export function aliasHint(config: EoriaConfig): string {
  const srcRoot = config.components.split('/')[0] || 'src'
  return `"${aliasPrefix(config.alias)}/*": ["./${srcRoot}/*"]`
}

/**
 * Adds `"@/*": ["./src/*"]` to tsconfig paths when the alias needs it and nothing is set.
 * Returns `tsconfig.json` when it changed the file.
 */
export async function ensureAlias(root: string, config: EoriaConfig): Promise<string | undefined> {
  if ((await aliasState(root, config)) !== 'missing') return undefined
  const prefix = aliasPrefix(config.alias)
  const file = resolve(root, 'tsconfig.json')
  const srcRoot = config.components.split('/')[0] || 'src'
  try {
    const json = JSON.parse(await readFile(file, 'utf8')) as {
      compilerOptions?: Record<string, unknown>
    }
    json.compilerOptions ??= {}
    const paths = (json.compilerOptions.paths as Record<string, string[]> | undefined) ?? {}
    paths[`${prefix}/*`] = [`./${srcRoot}/*`]
    json.compilerOptions.paths = paths
    await writeFile(file, JSON.stringify(json, null, 2) + '\n')
    log.ok(`Added "${prefix}/*" path alias to tsconfig.json`)
    return 'tsconfig.json'
  } catch {
    log.warn(`Add ${aliasHint(config)} to compilerOptions.paths in tsconfig.json.`)
    return undefined
  }
}

/**
 * Runs the install command for the project's package manager. `code` is its exit code, or null
 * when the binary could not start.
 */
export async function installPackages(
  root: string,
  packages: string[],
): Promise<{ command: string[]; code: number | null }> {
  const command = await installCommand(root, packages)
  log.step(command.join(' '))
  try {
    return { command, code: await run(command, root) }
  } catch (error) {
    log.warn(`Could not run ${command[0]}: ${(error as Error).message}`)
    return { command, code: null }
  }
}

/**
 * Runs the install for `init` and `add`, which write their files first. A failed install
 * throws, naming the files already on disk and the command that finishes the job.
 */
export async function installOrFail(
  root: string,
  packages: string[],
  written: string[],
): Promise<void> {
  const { command, code } = await installPackages(root, packages)
  if (code === 0) return
  throw new CliError(
    [
      code === null ? 'The install did not start.' : `The install exited with ${code}.`,
      ...(written.length > 0
        ? [`  Already written and left in place: ${written.join(', ')}.`]
        : []),
      '  Fix the cause, then run:',
      `    ${command.join(' ')}`,
    ].join('\n'),
  )
}
