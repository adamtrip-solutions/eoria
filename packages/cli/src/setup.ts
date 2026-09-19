import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { aliasToDirectory, type EoriaConfig } from './config'
import { installCommand, run } from './project'
import { log } from './log'

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

/** Writes `unistyles.ts` under the source root unless it exists. */
export async function ensureUnistylesFile(root: string, srcRoot: string): Promise<void> {
  const unistyles = resolve(root, srcRoot, 'unistyles.ts')
  if (!existsSync(unistyles)) {
    await mkdir(dirname(unistyles), { recursive: true })
    await writeFile(unistyles, UNISTYLES_FILE)
    log.ok(`Wrote ${srcRoot}/unistyles.ts.`)
  } else {
    log.step(`${srcRoot}/unistyles.ts exists, left as is.`)
  }
}

/**
 * Prepends `import '@/unistyles'` to the root layout so the themes register
 * before any stylesheet is created. Without it Unistyles throws on the first
 * component. Reports when no entry file can be found.
 */
export async function ensureThemeImport(
  root: string,
  srcRoot: string,
  config: EoriaConfig,
): Promise<void> {
  const prefix = aliasPrefix(config.alias)
  const entry = findEntryFile(root, srcRoot)
  if (!entry) {
    log.warn(
      `Could not find your root layout. Add ${log.bold(themeImportHint(config))} as the first import of your entry file.`,
    )
    return
  }
  const file = resolve(root, entry)
  const text = await readFile(file, 'utf8')
  if (importsUnistyles(text)) {
    log.step(`${entry} already imports unistyles.`)
    return
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
}

export async function babelState(root: string): Promise<BabelState> {
  const file = resolve(root, BABEL_CONFIG)
  if (!existsSync(file)) {
    return { exists: false, unistyles: false, worklets: false, workletsLast: null }
  }
  const text = await readFile(file, 'utf8')
  const worklets = text.includes(WORKLETS_PLUGIN)
  const last = worklets ? lastPlugin(text) : null
  return {
    exists: true,
    unistyles: text.includes(UNISTYLES_PLUGIN),
    worklets,
    workletsLast: last === null ? null : last.includes(WORKLETS_PLUGIN),
  }
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

/** Writes `babel.config.js` when there is none. Otherwise says which plugins to paste. */
export async function ensureBabelConfig(root: string, srcRoot: string): Promise<void> {
  const state = await babelState(root)
  if (!state.exists) {
    await writeFile(resolve(root, BABEL_CONFIG), BABEL_FILE(srcRoot))
    log.ok('Wrote babel.config.js with the Unistyles and Worklets plugins.')
  } else if (!state.unistyles) {
    log.warn(
      `babel.config.js exists. Add ['${UNISTYLES_PLUGIN}', { root: '${srcRoot}' }] and '${WORKLETS_PLUGIN}' to its plugins.`,
    )
  }
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

/** Adds `"@/*": ["./src/*"]` to tsconfig paths when the alias needs it and nothing is set. */
export async function ensureAlias(root: string, config: EoriaConfig): Promise<void> {
  if ((await aliasState(root, config)) !== 'missing') return
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
  } catch {
    log.warn(`Add ${aliasHint(config)} to compilerOptions.paths in tsconfig.json.`)
  }
}

/** Runs the install command for the project's package manager and reports a bad exit. */
export async function installPackages(root: string, packages: string[]): Promise<number> {
  const command = await installCommand(root, packages)
  log.step(command.join(' '))
  const code = await run(command, root)
  if (code !== 0) log.warn(`Install exited with ${code}. Run it again by hand.`)
  return code
}
