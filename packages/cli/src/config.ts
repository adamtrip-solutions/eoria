import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

export const DEFAULT_REGISTRY = 'https://eoria.adamtrip.pt/r'
export const CONFIG_FILE = 'eoria.json'

export interface EoriaConfig {
  $schema?: string
  /** Registry base URL, or a local directory for development. */
  registry: string
  /** Directory that receives component files, relative to the project root. */
  components: string
  /**
   * Directory that receives blocks. Leave it out to use the `blocks` folder next to `components`.
   */
  blocks?: string
  /** Import alias that resolves to `components`. Registry sources use `@/components/ui`. */
  alias: string
  /** Content hash of every file at the time it was copied, keyed by item name. */
  installed: Record<string, Record<string, string>>
}

export const defaultConfig: EoriaConfig = {
  $schema: 'https://eoria.adamtrip.pt/schema.json',
  registry: DEFAULT_REGISTRY,
  components: 'src/components/ui',
  alias: '@/components/ui',
  installed: {},
}

export function findProjectRoot(from = process.cwd()): string {
  let dir = from
  for (;;) {
    if (existsSync(resolve(dir, CONFIG_FILE)) || existsSync(resolve(dir, 'package.json')))
      return dir
    const parent = dirname(dir)
    if (parent === dir) return from
    dir = parent
  }
}

export async function readConfig(root: string): Promise<EoriaConfig | null> {
  const file = resolve(root, CONFIG_FILE)
  if (!existsSync(file)) return null
  const raw = JSON.parse(await readFile(file, 'utf8')) as Partial<EoriaConfig>
  return { ...defaultConfig, ...raw, installed: raw.installed ?? {} }
}

export async function writeConfig(root: string, config: EoriaConfig): Promise<void> {
  await writeFile(resolve(root, CONFIG_FILE), JSON.stringify(config, null, 2) + '\n')
}

/**
 * A shadcn `components.json` can seed the config, so a project that already
 * uses the shadcn CLI keeps its folder and alias.
 */
export async function configFromShadcn(root: string): Promise<Partial<EoriaConfig> | null> {
  const file = resolve(root, 'components.json')
  if (!existsSync(file)) return null
  const raw = JSON.parse(await readFile(file, 'utf8')) as { aliases?: { ui?: string } }
  const alias = raw.aliases?.ui
  if (!alias) return null
  return { alias, components: await aliasToDirectory(root, alias) }
}

/** Resolves `@/components/ui` through tsconfig `paths`, falling back to `src/`. */
export async function aliasToDirectory(root: string, alias: string): Promise<string> {
  const file = resolve(root, 'tsconfig.json')
  const match = /^(@[^/]*|~)\/(.*)$/.exec(alias)
  if (!match) return alias
  const [, prefix, rest] = match
  let base = 'src'
  if (existsSync(file)) {
    try {
      const tsconfig = JSON.parse(stripJsonComments(await readFile(file, 'utf8'))) as {
        compilerOptions?: { paths?: Record<string, string[]> }
      }
      const target = tsconfig.compilerOptions?.paths?.[`${prefix}/*`]?.[0]
      if (target) base = target.replace(/^\.\//, '').replace(/\/\*$/, '')
    } catch {
      // Unparseable tsconfig: keep the default.
    }
  }
  return base === '.' || base === '' ? (rest ?? '') : `${base}/${rest ?? ''}`
}

function stripJsonComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}
