import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import {
  aliasToDirectory,
  configFromShadcn,
  defaultConfig,
  readConfig,
  writeConfig,
  type EoriaConfig,
} from '../config'
import { installCommand, missingDependencies, run } from '../project'
import { log } from '../log'

export const PEERS = [
  'react-native-unistyles',
  'react-native-nitro-modules',
  'react-native-edge-to-edge',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-svg',
  'lucide-react-native',
]

export interface InitOptions {
  registry?: string
  dir?: string
  alias?: string
  yes?: boolean
  install?: boolean
}

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
    plugins: [['react-native-unistyles/plugin', { root: '${root}' }], 'react-native-worklets/plugin'],
  }
}
`

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

  const unistyles = resolve(root, srcRoot, 'unistyles.ts')
  if (!existsSync(unistyles)) {
    await mkdir(dirname(unistyles), { recursive: true })
    await writeFile(unistyles, UNISTYLES_FILE)
    log.ok(`Wrote ${srcRoot}/unistyles.ts.`)
  } else {
    log.step(`${srcRoot}/unistyles.ts exists, left as is.`)
  }
  await ensureThemeImport(root, srcRoot, config)

  const babel = resolve(root, 'babel.config.js')
  if (!existsSync(babel)) {
    await writeFile(babel, BABEL_FILE(srcRoot))
    log.ok('Wrote babel.config.js with the Unistyles and Worklets plugins.')
  } else {
    const text = await readFile(babel, 'utf8')
    if (!text.includes('react-native-unistyles/plugin')) {
      log.warn(
        `babel.config.js exists. Add ['react-native-unistyles/plugin', { root: '${srcRoot}' }] and 'react-native-worklets/plugin' to its plugins.`,
      )
    }
  }

  await ensureAlias(root, config)

  const wanted = ['@eoria/core', ...PEERS]
  const missing = await missingDependencies(root, wanted)
  if (missing.length === 0) {
    log.ok('All peer dependencies are installed.')
  } else if (options.install === false) {
    log.step(`Install the peers when ready:\n  ${(await installCommand(root, missing)).join(' ')}`)
  } else {
    const command = await installCommand(root, missing)
    log.step(command.join(' '))
    const code = await run(command, root)
    if (code !== 0) log.warn(`Install exited with ${code}. Run it again by hand.`)
  }

  log.info('')
  log.info(
    `Next: ${log.bold('npx @eoria/cli add button')}, then mount <PortalHost /> and <Toaster /> in your root layout.`,
  )
  log.info(log.dim('Full steps: https://eoria.adamtrip.pt/start/installation/'))
}

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
  const prefix = /^(@[^/]*|~)\//.exec(config.alias)?.[1]
  const candidates = ENTRY_FILES.flatMap((f) => (srcRoot === '.' ? [f] : [`${srcRoot}/${f}`, f]))
  const entry = candidates.find((f) => existsSync(resolve(root, f)))
  if (!entry) {
    log.warn(
      `Could not find your root layout. Add ${log.bold(`import '${prefix ? `${prefix}/unistyles` : './unistyles'}'`)} as the first import of your entry file.`,
    )
    return
  }
  const file = resolve(root, entry)
  const text = await readFile(file, 'utf8')
  if (
    /^\s*import\s+['"][^'"]*\/unistyles['"]/m.test(text) ||
    /from\s+['"][^'"]*\/unistyles['"]/.test(text)
  ) {
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

/**
 * The folder the `@/` alias points at, from tsconfig `paths`. That is where
 * `unistyles.ts` goes and what the Unistyles Babel plugin should scope to.
 */
async function sourceRoot(root: string, config: EoriaConfig): Promise<string> {
  const prefix = /^(@[^/]*|~)\//.exec(config.alias)?.[1]
  if (!prefix) return config.components.split('/')[0] || 'src'
  const dir = (await aliasToDirectory(root, `${prefix}/x`)).replace(/\/?x$/, '')
  return dir === '' ? '.' : dir
}

/** Adds `"@/*": ["./src/*"]` to tsconfig paths when the alias needs it and nothing is set. */
async function ensureAlias(root: string, config: EoriaConfig): Promise<void> {
  const prefix = /^(@[^/]*|~)\//.exec(config.alias)?.[1]
  if (!prefix) return
  const file = resolve(root, 'tsconfig.json')
  if (!existsSync(file)) return
  const text = await readFile(file, 'utf8')
  if (text.includes(`"${prefix}/*"`)) return
  const srcRoot = config.components.split('/')[0] || 'src'
  try {
    const json = JSON.parse(text) as { compilerOptions?: Record<string, unknown> }
    json.compilerOptions ??= {}
    const paths = (json.compilerOptions.paths as Record<string, string[]> | undefined) ?? {}
    paths[`${prefix}/*`] = [`./${srcRoot}/*`]
    json.compilerOptions.paths = paths
    await writeFile(file, JSON.stringify(json, null, 2) + '\n')
    log.ok(`Added "${prefix}/*" path alias to tsconfig.json`)
  } catch {
    log.warn(`Add "${prefix}/*": ["./${srcRoot}/*"] to compilerOptions.paths in tsconfig.json.`)
  }
}
