import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { add } from '../commands/add'
import { doctor, runDoctor, type DoctorReport } from '../commands/doctor'
import { init } from '../commands/init'
import { defaultConfig, writeConfig } from '../config'
import { REQUIRED_PACKAGES, babelState } from '../setup'

const registryDir = resolve(__dirname, '../../../../registry/dist')
const hasRegistry = existsSync(join(registryDir, 'index.json'))
const maybe = hasRegistry ? test : test.skip

const LAYOUT = "import { Stack } from 'expo-router'\n\nexport default () => <Stack />\n"

/** Commands print as they go. The tests read reports, so keep the output out of the run. */
async function quiet<T>(task: () => Promise<T>): Promise<{ result: T; text: string }> {
  const lines: string[] = []
  const spy = jest.spyOn(console, 'log').mockImplementation((msg = '') => {
    lines.push(String(msg))
  })
  try {
    return { result: await task(), text: lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '') }
  } finally {
    spy.mockRestore()
  }
}

/** A project with every package in place, so `--fix` never reaches for the network. */
async function project(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  const dependencies = Object.fromEntries(REQUIRED_PACKAGES.map((name) => [name, '*']))
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'app', dependencies }))
  await writeFile(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }))
  await mkdir(join(root, 'src/app'), { recursive: true })
  await writeFile(join(root, 'src/app/_layout.tsx'), LAYOUT)
  return root
}

const statuses = (report: DoctorReport) =>
  Object.fromEntries(report.checks.map((check) => [check.id, check.status]))

maybe('doctor passes on a project that init produced', async () => {
  const root = await project()
  await quiet(() => init(root, { registry: registryDir, install: false }))
  await quiet(() => add(root, ['select'], { install: false }))

  const report = await runDoctor(root)
  expect(report.checks.filter((check) => check.status !== 'pass')).toEqual([])
  expect(report.checks.map((check) => check.id)).toEqual([
    'config',
    'registry',
    'components-folder',
    'alias',
    'unistyles-file',
    'theme-import',
    'babel',
    'peers',
    'installed-files',
    'registry-dependencies',
    'npm-dependencies',
  ])
  expect(report).toMatchObject({
    ok: true,
    root,
    fixed: [],
    summary: { pass: 11, warn: 0, fail: 0 },
  })
  expect(report.checks.every((check) => check.remedy === null)).toBe(true)
})

maybe(
  'doctor fails without the Babel plugin and the alias, and --fix repairs the alias',
  async () => {
    const root = await project()
    await writeConfig(root, { ...defaultConfig, registry: registryDir })
    await mkdir(join(root, 'src/components/ui'), { recursive: true })
    await writeFile(
      join(root, 'babel.config.js'),
      "module.exports = { presets: ['babel-preset-expo'] }\n",
    )

    const before = await runDoctor(root)
    expect(before.ok).toBe(false)
    expect(statuses(before)).toMatchObject({
      config: 'pass',
      alias: 'fail',
      'unistyles-file': 'fail',
      'theme-import': 'fail',
      babel: 'fail',
      peers: 'pass',
    })
    const babel = before.checks.find((check) => check.id === 'babel')
    expect(babel?.message).toContain('react-native-unistyles/plugin')
    expect(babel?.remedy).toContain('react-native-worklets/plugin')
    expect(babel?.fixable).toBe(false)
    expect(before.checks.find((check) => check.id === 'alias')?.fixable).toBe(true)
    // Nothing is written without --fix.
    expect(await readFile(join(root, 'tsconfig.json'), 'utf8')).toBe('{"compilerOptions":{}}')

    const exitCode = process.exitCode
    const printed = await quiet(() => doctor(root, {}))
    expect(process.exitCode).toBe(1)
    process.exitCode = exitCode
    expect(printed.text).toMatch(/✗ tsconfig\.json has no "@\/\*" path/)
    expect(printed.text).toContain('failed.')

    const { result: after } = await quiet(() => runDoctor(root, { fix: true }))
    expect(after.fixed).toEqual(['alias', 'unistyles-file'])
    expect(statuses(after)).toMatchObject({
      alias: 'pass',
      'unistyles-file': 'pass',
      'theme-import': 'fail',
      babel: 'fail',
    })
    expect(after.ok).toBe(false)
    const tsconfig = JSON.parse(await readFile(join(root, 'tsconfig.json'), 'utf8'))
    expect(tsconfig.compilerOptions.paths).toEqual({ '@/*': ['./src/*'] })
    expect(existsSync(join(root, 'src/unistyles.ts'))).toBe(true)
    // --fix leaves the layout and the Babel config to the user.
    expect(await readFile(join(root, 'src/app/_layout.tsx'), 'utf8')).toBe(LAYOUT)
  },
)

maybe('doctor reports missing files, registry dependencies and packages', async () => {
  const root = await project()
  await quiet(() => init(root, { registry: registryDir, install: false }))
  await quiet(() => add(root, ['button'], { install: false }))
  await rm(join(root, 'src/components/ui/button.tsx'))
  const config = JSON.parse(await readFile(join(root, 'eoria.json'), 'utf8'))
  delete config.installed.text
  await writeFile(join(root, 'eoria.json'), JSON.stringify(config))
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'app', dependencies: {} }))

  const report = await runDoctor(root)
  expect(statuses(report)).toMatchObject({
    peers: 'fail',
    'installed-files': 'fail',
    'registry-dependencies': 'fail',
  })
  const find = (id: string) => report.checks.find((check) => check.id === id)
  expect(find('installed-files')?.message).toContain('src/components/ui/button.tsx')
  expect(find('registry-dependencies')?.remedy).toContain('eoria add text')
  expect(find('peers')?.message).toContain('@eoria/core')
})

test('doctor stops at a missing or broken eoria.json', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  const missing = await runDoctor(root)
  expect(missing.ok).toBe(false)
  expect(missing.checks).toEqual([
    {
      id: 'config',
      status: 'fail',
      message: `No eoria.json in ${root}.`,
      remedy: 'Run `npx @eoria/cli init`.',
      fixable: false,
    },
  ])
  await writeFile(join(root, 'eoria.json'), '{ nope')
  expect((await runDoctor(root)).checks[0]?.message).toContain('does not parse')
})

test('babelState finds the plugins and whether Worklets comes last', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  expect(await babelState(root)).toEqual({
    exists: false,
    unistyles: false,
    worklets: false,
    workletsLast: null,
  })
  const write = (plugins: string) =>
    writeFile(join(root, 'babel.config.js'), `module.exports = { plugins: ${plugins} }\n`)

  await write(
    "[['react-native-unistyles/plugin', { root: 'src' }], 'react-native-worklets/plugin']",
  )
  expect(await babelState(root)).toMatchObject({
    unistyles: true,
    worklets: true,
    workletsLast: true,
  })

  await write(
    "[\n  'react-native-worklets/plugin', // it's first\n  ['react-native-unistyles/plugin', { root: 'src' }],\n]",
  )
  expect(await babelState(root)).toMatchObject({ worklets: true, workletsLast: false })

  await write('[]')
  expect(await babelState(root)).toMatchObject({ exists: true, unistyles: false, worklets: false })
})
