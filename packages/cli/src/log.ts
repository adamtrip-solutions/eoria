import pc from 'picocolors'

let print = (msg: string) => console.log(msg)

/**
 * Sends progress lines to stderr. `--json` commands call this so stdout carries the JSON
 * and nothing else.
 */
export function logToStderr(): void {
  print = (msg: string) => console.error(msg)
}

export const log = {
  info: (msg: string) => print(msg),
  step: (msg: string) => print(`${pc.cyan('›')} ${msg}`),
  ok: (msg: string) => print(`${pc.green('✓')} ${msg}`),
  warn: (msg: string) => print(`${pc.yellow('!')} ${msg}`),
  error: (msg: string) => console.error(`${pc.red('✗')} ${msg}`),
  dim: (msg: string) => pc.dim(msg),
  bold: (msg: string) => pc.bold(msg),
}

export class CliError extends Error {}
