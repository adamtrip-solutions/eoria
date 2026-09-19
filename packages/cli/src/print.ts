import pc from 'picocolors'
import { log, logToStderr } from './log'
import { runToStderr } from './project'
import { STATUS_LABELS, type FileStatus } from './status'

/** Output of `formatDiff`, with added lines green and removed lines red. */
export function printDiff(lines: string[]): void {
  for (const line of lines) {
    console.log(
      line.startsWith('+') ? pc.green(line) : line.startsWith('-') ? pc.red(line) : log.dim(line),
    )
  }
}

/** The heading `diff` prints above the hunks of one file. */
export function printFileStatus(item: string, target: string, status: FileStatus): void {
  log.warn(`${item} ${log.dim(target)} ${pc.yellow(STATUS_LABELS[status])}`)
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2))
}

/** Pads every column but the last to the width of its longest cell. */
export function columns(rows: string[][]): string[] {
  const widths: number[] = []
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, cell.length)
    })
  }
  return rows.map((row) =>
    row
      .map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index]!)))
      .join('  ')
      .trimEnd(),
  )
}

/** Keeps stdout for the JSON. Progress lines and installer output go to stderr. */
export function reserveStdout(): void {
  logToStderr()
  runToStderr()
}
