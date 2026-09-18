import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { add, planAdd } from '../commands/add'
import { docsBaseUrl, docsPaths, fetchDocs } from '../commands/docs'
import { info, projectInfo } from '../commands/info'
import { list, listItems } from '../commands/list'
import { search, searchItems } from '../commands/search'
import { view, viewItem } from '../commands/view'
import { defaultConfig, readConfig, writeConfig } from '../config'

const registryDir = resolve(__dirname, '../../../../registry/dist')
const hasRegistry = existsSync(join(registryDir, 'index.json'))
const maybe = hasRegistry ? test : test.skip

/** Runs a command and returns what it printed, without colour codes. */
async function capture(task: () => Promise<void>): Promise<string> {
  const lines: string[] = []
  const spy = jest.spyOn(console, 'log').mockImplementation((msg = '') => {
    lines.push(String(msg))
  })
  try {
    await task()
  } finally {
    spy.mockRestore()
  }
  return lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '')
}

async function project(pkg: Record<string, unknown> = { name: 'app', dependencies: {} }) {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  await writeFile(join(root, 'package.json'), JSON.stringify(pkg))
  await mkdir(join(root, 'src'), { recursive: true })
  await writeConfig(root, {
    ...defaultConfig,
    registry: registryDir,
    alias: '~/ui',
    components: 'src/ui',
  })
  return root
}

/** Every file under a folder with its content, to prove a command wrote nothing. */
async function snapshot(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = join(root, entry.name)
    if (entry.isDirectory()) Object.assign(out, await snapshot(file))
    else out[file] = await readFile(file, 'utf8')
  }
  return out
}

maybe('list marks installed items and works outside a project', async () => {
  const root = await project()
  await capture(() => add(root, ['button'], { install: false }))

  const { registry, items } = await listItems(root)
  expect(registry).toBe(registryDir)
  expect(items.find((item) => item.name === 'button')).toEqual({
    name: 'button',
    title: 'Button',
    description: expect.stringContaining('Pressable'),
    type: 'registry:ui',
    installed: true,
  })
  expect(items.find((item) => item.name === 'select')?.installed).toBe(false)

  const text = await capture(() => list(root, {}))
  expect(text).toMatch(/^✓ button\s+Button\s+Pressable/m)
  expect(text).toMatch(/^ {2}select\s+Select\s+/m)
  expect(text).toContain('2 installed')

  const json = JSON.parse(await capture(() => list(root, { json: true })))
  expect(Object.keys(json)).toEqual(['registry', 'items'])
  expect(Object.keys(json.items[0])).toEqual(['name', 'title', 'description', 'type', 'installed'])

  const outside = await mkdtemp(join(tmpdir(), 'eoria-'))
  const bare = await listItems(outside, { registry: registryDir })
  expect(bare.items.length).toBe(items.length)
  expect(bare.items.every((item) => item.installed === null)).toBe(true)
})

maybe('search ignores case and puts name matches first', async () => {
  const root = await project()
  const names = (await searchItems(root, 'TEXT')).items.map((item) => item.name)
  expect(names[0]).toBe('text')
  expect(names[1]).toBe('textarea')
  // `label` only mentions Text in its description.
  expect(names.indexOf('label')).toBeGreaterThan(names.indexOf('textarea'))
  expect(names).not.toContain('button')

  expect((await searchItems(root, 'dynamic type')).items.map((item) => item.name)).toEqual(['text'])

  const json = JSON.parse(await capture(() => search(root, 'button', { json: true })))
  expect(Object.keys(json)).toEqual(['registry', 'query', 'items'])
  expect(json.query).toBe('button')
  expect(json.items[0].name).toBe('button')

  expect(await capture(() => search(root, 'zzzz', {}))).toContain('Nothing matches "zzzz"')
  await expect(searchItems(root, '  ')).rejects.toThrow('something to look for')
})

maybe('view resolves registry dependencies transitively', async () => {
  const root = await project()
  const item = await viewItem(root, 'select')
  expect(item.title).toBe('Select')
  expect(item.registryDependencies).toEqual(['popper', 'text'])
  expect(item.allRegistryDependencies).toEqual(expect.arrayContaining(['popper', 'portal', 'text']))
  expect(item.allRegistryDependencies).not.toContain('select')
  expect(item.allDependencies).toEqual(expect.arrayContaining(item.dependencies))
  expect(item.installed).toBe(false)
  expect(item.files[0]).toEqual({
    path: 'registry/ui/select.tsx',
    type: 'registry:ui',
    target: 'components/ui/select.tsx',
    localPath: 'src/ui/select.tsx',
  })

  const withSource = await viewItem(root, 'button', { source: true })
  expect(withSource.files[0]?.content).toContain("from '~/ui/text'")

  const text = await capture(() => view(root, 'select', {}))
  expect(text).toContain('add also brings')
  expect(text).toContain('components/ui/select.tsx > src/ui/select.tsx')
  expect(text).not.toContain('import ')
  expect(await capture(() => view(root, 'select', { source: true }))).toContain('import ')

  await expect(viewItem(root, 'no-such-item')).rejects.toThrow('no-such-item.json not found')
  await expect(viewItem(root, '../evil')).rejects.toThrow('plain name')
})

maybe('info labels an edited file and a missing file', async () => {
  const root = await project({
    name: 'app',
    dependencies: { expo: '~54.0.0', 'react-native-unistyles': '^3.0.0' },
    devDependencies: { '@eoria/core': '0.1.0' },
  })
  await writeFile(join(root, 'pnpm-lock.yaml'), '')
  await capture(() => add(root, ['button'], { install: false }))
  const button = join(root, 'src/ui/button.tsx')
  await writeFile(button, (await readFile(button, 'utf8')) + '\n// edited')
  await rm(join(root, 'src/ui/text.tsx'))

  const result = await projectInfo(root)
  expect(result.installed).toEqual([
    {
      name: 'text',
      files: [{ path: 'src/ui/text.tsx', status: 'missing', label: 'file missing' }],
    },
    {
      name: 'button',
      files: [{ path: 'src/ui/button.tsx', status: 'local', label: 'edited locally' }],
    },
  ])
  expect(result.config).toEqual({
    path: join(root, 'eoria.json'),
    error: null,
    values: { registry: registryDir, components: 'src/ui', alias: '~/ui' },
  })
  expect(result.registry).toEqual({
    location: registryDir,
    source: 'eoria.json',
    remote: false,
    reachable: true,
    error: null,
  })
  expect(result.components).toEqual({ directory: 'src/ui', alias: '~/ui', exists: true })
  expect(result.packageManager).toBe('pnpm')
  expect(result.expo).toBe(true)
  expect(result.packages).toEqual({
    '@eoria/core': '0.1.0',
    'react-native-unistyles': '^3.0.0',
    'react-native-reanimated': null,
    'react-native-worklets': null,
  })

  const json = JSON.parse(await capture(() => info(root, { json: true })))
  expect(Object.keys(json)).toEqual([
    'cli',
    'root',
    'config',
    'registry',
    'components',
    'installed',
    'packageManager',
    'expo',
    'packages',
  ])
  const text = await capture(() => info(root, {}))
  expect(text).toMatch(/button\s+src\/ui\/button\.tsx\s+edited locally/)
  expect(text).toMatch(/text\s+src\/ui\/text\.tsx\s+file missing/)
})

maybe('info still reports local edits when the registry is gone', async () => {
  const root = await project()
  await capture(() => add(root, ['text'], { install: false }))
  const result = await projectInfo(root, { registry: join(root, 'no-registry') })
  expect(result.registry.reachable).toBe(false)
  expect(result.registry.source).toBe('flag')
  expect(result.installed[0]?.files[0]?.status).toBe('unknown')
})

test('info works outside a project', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  const result = await projectInfo(root, { registry: join(root, 'no-registry') })
  expect(result.config).toEqual({ path: null, error: null, values: null })
  expect(result.components).toBeNull()
  expect(result.installed).toEqual([])
  expect(result.packageManager).toBe('npm')
})

test('docs URLs come from the registry URL or the override', () => {
  expect(docsBaseUrl('https://eoria.adamtrip.pt/r')).toBe('https://eoria.adamtrip.pt')
  expect(docsBaseUrl('https://example.com/ui/r/')).toBe('https://example.com/ui')
  expect(docsBaseUrl('/tmp/registry', 'https://docs.example.com/')).toBe('https://docs.example.com')
  expect(() => docsBaseUrl('/tmp/registry')).toThrow(/local folder.*--docs-url/)
  expect(() => docsBaseUrl('https://example.com/registry')).toThrow('--docs-url')

  expect(docsPaths()).toEqual(['/llms.txt'])
  expect(docsPaths('select')).toEqual(['/components/select.md', '/start/select.md'])
  expect(docsPaths('/start/theming/')).toEqual(['/start/theming.md'])
  expect(() => docsPaths('../secrets')).toThrow('not a docs topic')
})

test('fetchDocs tries the component page, then the guide, and names what failed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  const pages: Record<string, string> = {
    'https://eoria.adamtrip.pt/llms.txt': '# eoria',
    'https://eoria.adamtrip.pt/components/select.md': '# Select',
    'https://eoria.adamtrip.pt/start/theming.md': '# Theming',
  }
  const asked: string[] = []
  const fakeFetch = async (url: string) => {
    asked.push(url)
    const body = pages[url]
    return {
      ok: body !== undefined,
      status: body === undefined ? 404 : 200,
      headers: new Headers({ 'content-type': 'text/markdown' }),
      text: async () => body ?? 'Not found',
    }
  }

  // No eoria.json here, so the default registry decides the docs URL.
  expect(await fetchDocs(root, 'select', { fetch: fakeFetch })).toEqual({
    topic: 'select',
    url: 'https://eoria.adamtrip.pt/components/select.md',
    markdown: '# Select',
  })
  expect((await fetchDocs(root, 'theming', { fetch: fakeFetch })).markdown).toBe('# Theming')
  expect(asked.slice(-2)).toEqual([
    'https://eoria.adamtrip.pt/components/theming.md',
    'https://eoria.adamtrip.pt/start/theming.md',
  ])
  expect((await fetchDocs(root, undefined, { fetch: fakeFetch })).markdown).toBe('# eoria')

  await expect(fetchDocs(root, 'nope', { fetch: fakeFetch })).rejects.toThrow(
    'https://eoria.adamtrip.pt/components/nope.md responded 404, https://eoria.adamtrip.pt/start/nope.md responded 404',
  )
  await expect(
    fetchDocs(root, 'select', { fetch: fakeFetch, docsUrl: 'https://other.example' }),
  ).rejects.toThrow('https://other.example/components/select.md responded 404')

  // The live host answers a missing page with its HTML shell and a 200.
  const shell = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
    text: async () => '<!doctype html>',
  })
  await expect(fetchDocs(root, 'nope', { fetch: shell })).rejects.toThrow(
    'https://eoria.adamtrip.pt/start/nope.md responded with an HTML page',
  )
  await expect(
    fetchDocs(root, 'select', {
      fetch: async () => {
        throw new Error('offline')
      },
    }),
  ).rejects.toThrow('could not reach https://eoria.adamtrip.pt/components/select.md: offline')
})

test('fetchDocs explains a local registry and reads a local docs build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  await writeConfig(root, { ...defaultConfig, registry: registryDir })
  await expect(fetchDocs(root, 'select')).rejects.toThrow(/local folder.*--docs-url/)

  const site = join(root, 'site')
  await mkdir(join(site, 'start'), { recursive: true })
  await writeFile(join(site, 'start/theming.md'), '# Theming\n')
  const page = await fetchDocs(root, 'theming', { docsUrl: site })
  expect(page).toEqual({
    topic: 'theming',
    url: join(site, 'start/theming.md'),
    markdown: '# Theming\n',
  })
  await expect(fetchDocs(root, 'select', { docsUrl: site })).rejects.toThrow('does not exist')
})

maybe('add --dry-run writes nothing, eoria.json included', async () => {
  const root = await project()
  const before = await snapshot(root)
  const text = await capture(() => add(root, ['button'], { install: false, dryRun: true }))
  expect(await snapshot(root)).toEqual(before)
  expect((await readConfig(root))?.installed).toEqual({})
  expect(text).toContain('Also needed: text')
  expect(text).toContain('would write src/ui/text.tsx')
  expect(text).toContain('would write src/ui/button.tsx')
  expect(text).toMatch(/would print .*@eoria\/core/)
  expect(text).toContain('Nothing was written')

  await capture(() => add(root, ['button'], { install: false }))
  const button = join(root, 'src/ui/button.tsx')
  await writeFile(button, (await readFile(button, 'utf8')) + '\n// edited')
  const installed = await snapshot(root)

  const skip = await capture(() => add(root, ['button'], { install: false, dryRun: true }))
  expect(skip).toContain('would skip src/ui/button.tsx (you edited it)')
  expect(skip).toContain('src/ui/text.tsx already matches the registry')
  const replace = await capture(() =>
    add(root, ['button'], { install: false, dryRun: true, overwrite: true }),
  )
  expect(replace).toContain('would overwrite src/ui/button.tsx (you edited it)')
  expect(await snapshot(root)).toEqual(installed)

  const plan = await planAdd(root, (await readConfig(root))!, ['button'])
  expect(plan.items).toEqual(['text', 'button'])
  expect(plan.pulled).toEqual(['text'])
  expect(plan.files.map((file) => [file.target, file.action, file.edited])).toEqual([
    ['src/ui/text.tsx', 'same', false],
    ['src/ui/button.tsx', 'skip', true],
  ])
  expect(plan.missingPackages).toContain('@eoria/core')
})

maybe('add --diff prints hunks for existing files and writes nothing', async () => {
  const root = await project()
  await capture(() => add(root, ['text'], { install: false }))
  const file = join(root, 'src/ui/text.tsx')
  await writeFile(file, (await readFile(file, 'utf8')) + '\n// edited')
  const before = await snapshot(root)

  const text = await capture(() => add(root, ['button'], { install: false, diff: true }))
  expect(await snapshot(root)).toEqual(before)
  expect(existsSync(join(root, 'src/ui/button.tsx'))).toBe(false)
  expect(text).toMatch(/text src\/ui\/text\.tsx edited locally/)
  expect(text).toContain('- // edited')
  expect(text).toMatch(/button src\/ui\/button\.tsx new file/)
  expect(text).toContain('Nothing was written')
})
