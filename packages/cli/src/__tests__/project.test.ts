import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { add } from '../commands/add'
import { runDoctor } from '../commands/doctor'
import { init } from '../commands/init'
import { defaultConfig, writeConfig } from '../config'
import { CliError } from '../log'
import * as project from '../project'
import { detectPackageManager, installCommand } from '../project'

const registryDir = resolve(__dirname, '../../../../registry/dist')
const hasRegistry = existsSync(join(registryDir, 'index.json'))
const maybe = hasRegistry ? test : test.skip

/** Writes each file, creating folders, under a fresh temporary folder. */
async function tree(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(join(root, path), content)
  }
  return root
}

/** Commands print as they go; keep it out of the test output. */
async function quiet<T>(task: () => Promise<T>): Promise<T> {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
  try {
    return await task()
  } finally {
    spy.mockRestore()
  }
}

afterEach(() => jest.restoreAllMocks())

const app = JSON.stringify({ name: 'app', dependencies: {} })

test('detectPackageManager finds the lockfile of a workspace root', async () => {
  const root = await tree({ 'pnpm-lock.yaml': '', 'apps/mobile/package.json': app })
  expect(detectPackageManager(join(root, 'apps/mobile'))).toBe('pnpm')
  expect(await installCommand(join(root, 'apps/mobile'), ['a'])).toEqual(['pnpm', 'add', 'a'])

  const workspace = await tree({ 'pnpm-workspace.yaml': '', 'apps/mobile/package.json': app })
  expect(detectPackageManager(join(workspace, 'apps/mobile'))).toBe('pnpm')

  const yarn = await tree({ 'yarn.lock': '', 'packages/app/package.json': app })
  expect(detectPackageManager(join(yarn, 'packages/app'))).toBe('yarn')
})

test('detectPackageManager reads packageManager before lockfiles, nearest folder first', async () => {
  const field = await tree({
    'package.json': JSON.stringify({ private: true, packageManager: 'pnpm@11.8.0' }),
    'package-lock.json': '{}',
    'apps/mobile/package.json': app,
  })
  expect(detectPackageManager(join(field, 'apps/mobile'))).toBe('pnpm')

  // The app's own lockfile wins over one further up.
  const nested = await tree({ 'pnpm-lock.yaml': '', 'app/package.json': app, 'app/yarn.lock': '' })
  expect(detectPackageManager(join(nested, 'app'))).toBe('yarn')
})

test('detectPackageManager stops at the git root and falls back to npm', async () => {
  const root = await tree({
    'pnpm-lock.yaml': '',
    'repo/.git/HEAD': '',
    'repo/app/package.json': app,
  })
  expect(detectPackageManager(join(root, 'repo/app'))).toBe('npm')
  expect(await installCommand(join(root, 'repo/app'), ['a'])).toEqual(['npm', 'install', 'a'])
})

test('Expo apps install through expo install, told which manager to use', async () => {
  const expoApp = JSON.stringify({ dependencies: { expo: '~57.0.0' } })
  // A new workspace has no lockfile yet, which leaves Expo's own lookup on npm.
  const root = await tree({
    'package.json': JSON.stringify({ private: true, packageManager: 'pnpm@11.8.0' }),
    'pnpm-workspace.yaml': '',
    'apps/mobile/package.json': expoApp,
  })
  expect(await installCommand(join(root, 'apps/mobile'), ['a'])).toEqual([
    'npx',
    'expo',
    'install',
    '--pnpm',
    'a',
  ])

  const plain = await tree({ 'repo/.git/HEAD': '', 'repo/app/package.json': expoApp })
  expect(await installCommand(join(plain, 'repo/app'), ['a'])).toEqual([
    'npx',
    'expo',
    'install',
    '--npm',
    'a',
  ])
})

/** A project init can set up, outside any workspace. */
async function initProject(): Promise<string> {
  return tree({
    'package.json': app,
    'tsconfig.json': JSON.stringify({ compilerOptions: {} }),
    'src/app/_layout.tsx': "import { Stack } from 'expo-router'\n",
  })
}

maybe('init fails on a failed install and names what it already wrote', async () => {
  const root = await initProject()
  const run = jest.spyOn(project, 'run').mockResolvedValue(3)

  const error = await quiet(() => init(root, { registry: registryDir })).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(CliError)
  const message = (error as CliError).message
  expect(message).toContain('The install exited with 3.')
  expect(message).toContain(
    'Already written and left in place: eoria.json, src/unistyles.ts, src/app/_layout.tsx, babel.config.js, tsconfig.json.',
  )
  expect(message).toMatch(/\n {4}npm install @eoria\/core react-native-unistyles /)
  expect(run).toHaveBeenCalledWith(expect.arrayContaining(['npm', 'install']), root)
  expect(existsSync(join(root, 'src/unistyles.ts'))).toBe(true)
})

maybe('add fails on a failed install, and on an installer that does not start', async () => {
  const root = await tree({ 'package.json': app })
  await writeConfig(root, { ...defaultConfig, registry: registryDir, components: 'src/ui' })
  jest.spyOn(project, 'run').mockResolvedValue(1)

  await expect(quiet(() => add(root, ['button'], {}))).rejects.toThrow(
    /exited with 1\.\n {2}Already written and left in place: .*src\/ui\/button\.tsx, eoria\.json\.\n {2}Fix the cause, then run:\n {4}npm install /,
  )
  expect(existsSync(join(root, 'src/ui/button.tsx'))).toBe(true)

  jest.spyOn(project, 'run').mockRejectedValue(new Error('spawn npm ENOENT'))
  await expect(quiet(() => add(root, ['button'], {}))).rejects.toThrow(
    /^The install did not start\./,
  )

  // --no-install never runs anything.
  jest.spyOn(project, 'run').mockRejectedValue(new Error('should not run'))
  await expect(quiet(() => add(root, ['button'], { install: false }))).resolves.toBeUndefined()
})

maybe('doctor --fix still reports after a failed install', async () => {
  const root = await initProject()
  await quiet(() => init(root, { registry: registryDir, install: false }))
  jest.spyOn(project, 'run').mockResolvedValue(1)

  const report = await quiet(() => runDoctor(root, { fix: true }))
  expect(report.checks.find((check) => check.id === 'peers')?.status).toBe('fail')
  expect(report.fixed).not.toContain('peers')
})
