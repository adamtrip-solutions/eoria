import { createHash } from 'node:crypto'
import { basename, posix } from 'node:path'
import type { EoriaConfig } from './config'
import type { RegistryFile } from './registry'

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

const UI_PREFIX = 'components/ui/'
const BLOCKS_PREFIX = 'components/blocks/'

/** The part of `eoria.json` that decides where files land. */
export type Directories = Pick<EoriaConfig, 'components' | 'blocks'>

const toPosix = (path: string): string => path.replace(/\\/g, '/')

/**
 * Where blocks land. `blocks` in `eoria.json` wins. Without it, blocks go in the `blocks` folder
 * next to the components directory, so `src/components/ui` gives `src/components/blocks`.
 */
export function blocksDirectory(config: Directories): string {
  if (typeof config.blocks === 'string' && config.blocks.trim() !== '') {
    return posix.normalize(toPosix(config.blocks))
  }
  return posix.join(posix.dirname(posix.normalize(toPosix(config.components))), 'blocks')
}

/**
 * Where a registry file lands. A target like `components/ui/button.tsx` goes under the
 * components directory and one like `components/blocks/sign-in.tsx` under the blocks directory.
 * Whatever follows the prefix is kept, subfolders included. Any other target lands in the
 * components directory under its base name. Always a posix path so `eoria.json` keys match
 * across operating systems.
 *
 * Pass the config. A bare components directory still works, and gets the default blocks folder.
 */
export function localPath(
  config: Directories | string,
  file: Pick<RegistryFile, 'path' | 'target'>,
): string {
  const directories = typeof config === 'string' ? { components: config } : config
  const target = toPosix(file.target ?? file.path)
  const isBlock = target.startsWith(BLOCKS_PREFIX)
  const rel = isBlock
    ? target.slice(BLOCKS_PREFIX.length)
    : target.startsWith(UI_PREFIX)
      ? target.slice(UI_PREFIX.length)
      : basename(target)
  const safe = posix.normalize(rel)
  if (safe.startsWith('..') || posix.isAbsolute(safe)) {
    throw new Error(
      `refusing to write outside the ${isBlock ? 'blocks' : 'components'} directory: ${target}`,
    )
  }
  return posix.join(isBlock ? blocksDirectory(directories) : toPosix(directories.components), safe)
}

/** One path segment, or nothing. Used for names typed on the command line. */
export function assertPlainName(name: string, what: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    throw new Error(`${what} must be a plain name, got "${name}"`)
  }
}

/** Registry sources import each other as `@/components/ui/<name>`. Rewrite for another alias. */
export function rewriteAlias(content: string, alias: string): string {
  if (alias === '@/components/ui') return content
  return content.replace(/(['"])@\/components\/ui\//g, `$1${alias}/`)
}

export function kebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

export function pascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('')
}
