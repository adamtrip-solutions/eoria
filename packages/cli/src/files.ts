import { createHash } from 'node:crypto'
import { basename, posix } from 'node:path'
import type { RegistryFile } from './registry'

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

const REGISTRY_PREFIX = 'components/ui/'

/**
 * Where a registry file lands. Registry targets look like `components/ui/button.tsx`;
 * whatever follows that prefix, subfolders included, goes under the components directory.
 * Always a posix path so `eoria.json` keys match across operating systems.
 */
export function localPath(
  componentsDir: string,
  file: Pick<RegistryFile, 'path' | 'target'>,
): string {
  const target = (file.target ?? file.path).replace(/\\/g, '/')
  const rel = target.startsWith(REGISTRY_PREFIX)
    ? target.slice(REGISTRY_PREFIX.length)
    : basename(target)
  const safe = posix.normalize(rel)
  if (safe.startsWith('..') || posix.isAbsolute(safe)) {
    throw new Error(`refusing to write outside the components directory: ${target}`)
  }
  return posix.join(componentsDir.replace(/\\/g, '/'), safe)
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
