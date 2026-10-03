import { existsSync, readFileSync, statSync } from 'node:fs'
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

/**
 * The project file `package.json` `main` points to, relative to the project root. Undefined
 * when `main` is unset or names a package entry such as `expo-router/entry`.
 */
export function findMainFile(root: string): string | undefined {
  const pkg = resolve(root, 'package.json')
  if (!existsSync(pkg)) return undefined
  let main: unknown
  try {
    main = (JSON.parse(readFileSync(pkg, 'utf8')) as { main?: unknown }).main
  } catch {
    return undefined
  }
  if (typeof main !== 'string' || main === '') return undefined
  // Metro resolves `main` without an extension too.
  for (const candidate of ['', '.ts', '.tsx', '.js', '.jsx'].map((ext) => main + ext)) {
    const file = resolve(root, candidate)
    const rel = relative(root, file).split('\\').join('/')
    if (rel.startsWith('..') || rel.split('/').includes('node_modules')) return undefined
    if (existsSync(file) && statSync(file).isFile()) return rel
  }
  return undefined
}

export function importsUnistyles(text: string): boolean {
  return (
    /^\s*import\s+['"][^'"]*\/unistyles['"]/m.test(text) ||
    /from\s+['"][^'"]*\/unistyles['"]/.test(text)
  )
}

/**
 * Where the theme import lives or should go. `target` is the root layout, or the `main` file
 * when there is no layout. `importedBy` is the first of the two that imports unistyles, so an
 * Expo Router app whose custom entry imports the theme after `expo-router/entry` counts.
 */
export async function findThemeImport(
  root: string,
  srcRoot: string,
): Promise<{ target: string | undefined; importedBy?: string }> {
  const files = [...new Set([findEntryFile(root, srcRoot), findMainFile(root)])].filter(
    (f): f is string => f !== undefined,
  )
  for (const file of files) {
    if (importsUnistyles(await readFile(resolve(root, file), 'utf8'))) {
      return { target: files[0], importedBy: file }
    }
  }
  return { target: files[0] }
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
  const { target: entry, importedBy } = await findThemeImport(root, srcRoot)
  if (importedBy) {
    log.step(`${importedBy} already imports unistyles.`)
    return undefined
  }
  if (!entry) {
    log.warn(
      `Could not find your root layout. Add ${log.bold(themeImportHint(config))} as the first import of your entry file.`,
    )
    return undefined
  }
  const file = resolve(root, entry)
  const text = await readFile(file, 'utf8')
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
  /** Whether the project is on Expo SDK 54 or later and the config names the Expo preset. */
  expoPreset: boolean
  /**
   * Whether `babel-preset-expo` can be trusted to add the Worklets plugin, so the config need
   * not list it. See `presetAddsWorklets`.
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
      expoPreset: false,
      presetWorklets: false,
    }
  }
  const text = await readFile(file, 'utf8')
  const worklets = text.includes(WORKLETS_PLUGIN)
  const last = worklets ? lastPlugin(text) : null
  const expoPreset = EXPO_PRESET.test(text) && ((await expoMajor(root)) ?? 0) >= 54
  return {
    exists: true,
    unistyles: text.includes(UNISTYLES_PLUGIN),
    worklets,
    workletsLast: last === null ? null : last.includes(WORKLETS_PLUGIN),
    expoPreset,
    presetWorklets: expoPreset && presetAddsWorklets(text),
  }
}

const EXPO_PRESET = /['"](babel-preset-)?expo['"]/
const OTHER_PRESET = /@react-native\/babel-preset|metro-react-native-babel-preset/
const WORKLETS_OFF = /['"]?\b(worklets|reanimated)['"]?\s*:\s*false\b/

/**
 * From SDK 54 `babel-preset-expo` adds the Worklets plugin when `react-native-worklets` is
 * installed, after the config's own plugins, unless its options set `worklets` or
 * `reanimated` to false. This reads the raw text without parsing it, so it only says yes when
 * nothing in the file could mean otherwise: no React Native preset is named, and no
 * `worklets: false` or `reanimated: false` appears anywhere, comments included. A comment that
 * mentions `worklets: false` therefore makes doctor ask for the plugin. That costs one line,
 * which is always valid, while a wrong yes would hide a build without worklets.
 */
function presetAddsWorklets(text: string): boolean {
  return !OTHER_PRESET.test(text) && !WORKLETS_OFF.test(text)
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

/** Source text of the last element of the first `plugins: [...]` array, or null. */
function lastPlugin(source: string): string | null {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
  const start = /\bplugins\s*:\s*\[/.exec(text)
  if (!start) return null
  const elements: string[] = []
  let depth = 0
  let quote: string | null = null
  let current = ''
  for (let i = start.index + start[0].length; i < text.length; i++) {
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
        return elements[elements.length - 1] ?? null
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
