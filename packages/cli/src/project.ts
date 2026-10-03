import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm'

const MARKERS: Array<[file: string, manager: PackageManager]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['pnpm-workspace.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
]

/**
 * Reads the `packageManager` field, then the lockfiles, in the project and then in each parent
 * folder. In a workspace both live at the workspace root, not next to the app. The walk stops
 * at the first answer, after the folder that holds `.git`, or at the filesystem root.
 */
export function detectPackageManager(root: string): PackageManager {
  for (let dir = root; ; dir = dirname(dir)) {
    const found =
      packageManagerField(dir) ?? MARKERS.find(([file]) => existsSync(resolve(dir, file)))?.[1]
    if (found) return found
    if (existsSync(resolve(dir, '.git')) || dirname(dir) === dir) return 'npm'
  }
}

/** `pnpm` for `"packageManager": "pnpm@11.8.0"`, or undefined. */
function packageManagerField(dir: string): PackageManager | undefined {
  const file = resolve(dir, 'package.json')
  if (!existsSync(file)) return undefined
  try {
    const { packageManager } = JSON.parse(readFileSync(file, 'utf8')) as {
      packageManager?: unknown
    }
    const name = typeof packageManager === 'string' ? packageManager.split('@')[0] : undefined
    return MARKERS.find(([, manager]) => manager === name)?.[1]
  } catch {
    return undefined
  }
}

export async function readPackageJson(root: string): Promise<{
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
} | null> {
  const file = resolve(root, 'package.json')
  if (!existsSync(file)) return null
  return JSON.parse(await readFile(file, 'utf8'))
}

export async function missingDependencies(root: string, wanted: string[]): Promise<string[]> {
  const pkg = await readPackageJson(root)
  const have = new Set([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
  ])
  return [...new Set(wanted)].filter((dep) => !have.has(dep))
}

export async function usesExpo(root: string): Promise<boolean> {
  const pkg = await readPackageJson(root)
  return Boolean(pkg?.dependencies?.expo)
}

/**
 * `expo install` picks SDK-compatible versions, so prefer it when Expo is present. Expo only
 * looks for lockfiles and falls back to npm, so it gets the detected manager as a flag.
 */
export async function installCommand(root: string, deps: string[]): Promise<string[]> {
  const pm = detectPackageManager(root)
  if (await usesExpo(root)) return ['npx', 'expo', 'install', `--${pm}`, ...deps]
  return pm === 'npm' ? ['npm', 'install', ...deps] : [pm, 'add', ...deps]
}

let childStdout: 'inherit' | 2 = 'inherit'

/** Points the stdout of spawned commands at stderr. `--json` commands call this. */
export function runToStderr(): void {
  childStdout = 2
}

export function run(command: string[], cwd: string): Promise<number> {
  return new Promise((done, fail) => {
    const [bin, ...args] = command
    const child = spawn(bin!, args, {
      cwd,
      stdio: ['inherit', childStdout, 'inherit'],
      shell: process.platform === 'win32',
    })
    child.on('error', fail)
    child.on('close', (code) => done(code ?? 1))
  })
}
