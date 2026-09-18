import { hashContent } from './files'

/** How a local file relates to the registry file and to the hash `add` recorded. */
export type FileStatus = 'unchanged' | 'upstream' | 'local' | 'both' | 'missing'

export const STATUS_LABELS: Record<FileStatus, string> = {
  unchanged: 'up to date',
  upstream: 'registry changed',
  local: 'edited locally',
  both: 'edited locally and changed in the registry',
  missing: 'file missing',
}

/**
 * `local` is the file on disk, or null when it is gone. `upstream` is the registry file after
 * the alias rewrite. `recorded` is the hash from `eoria.json`, if `add` wrote the file.
 */
export function fileStatus(
  local: string | null,
  upstream: string,
  recorded: string | undefined,
): FileStatus {
  if (local === null) return 'missing'
  const localEdited = recorded !== undefined && hashContent(local) !== recorded
  const upstreamChanged = recorded !== undefined && hashContent(upstream) !== recorded
  if (!localEdited && !upstreamChanged) return local === upstream ? 'unchanged' : 'upstream'
  if (localEdited && upstreamChanged) return 'both'
  return localEdited ? 'local' : 'upstream'
}
