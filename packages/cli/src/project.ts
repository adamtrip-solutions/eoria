import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm'

export function detectPackageManager(root: string): PackageManager {
  if (existsSync(resolve(root, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(resolve(root, 'yarn.lock'))) return 'yarn'
  if (existsSync(resolve(root, 'bun.lock')) || existsSync(resolve(root, 'bun.lockb'))) return 'bun'
  return 'npm'
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

/** `expo install` picks SDK-compatible versions, so prefer it when Expo is present. */
export async function installCommand(root: string, deps: string[]): Promise<string[]> {
  const pm = detectPackageManager(root)
  if (await usesExpo(root)) return ['npx', 'expo', 'install', ...deps]
  return pm === 'npm' ? ['npm', 'install', ...deps] : [pm, 'add', ...deps]
}

export function run(command: string[], cwd: string): Promise<number> {
  return new Promise((done, fail) => {
    const [bin, ...args] = command
    const child = spawn(bin!, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('error', fail)
    child.on('close', (code) => done(code ?? 1))
  })
}
