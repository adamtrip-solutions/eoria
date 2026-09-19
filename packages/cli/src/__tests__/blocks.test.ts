import { PassThrough } from 'node:stream'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { add, planAdd } from '../commands/add'
import { diff } from '../commands/diff'
import { runDoctor } from '../commands/doctor'
import { info, projectInfo } from '../commands/info'
import { list, listItems } from '../commands/list'
import { search, searchItems } from '../commands/search'
import { viewItem } from '../commands/view'
import { defaultConfig, readConfig, writeConfig, type EoriaConfig } from '../config'
import { blocksDirectory, localPath } from '../files'
import { createMcpServer } from '../mcp/server'

const BUTTON = 'export const Button = () => null\n'
const SIGN_IN = "import { Button } from '@/components/ui/button'\nexport const SignIn = Button\n"

const button = {
  name: 'button',
  type: 'registry:ui',
  title: 'Button',
  description: 'Pressable with variants.',
  dependencies: [],
  registryDependencies: [],
  files: [
    {
      path: 'registry/ui/button.tsx',
      type: 'registry:ui',
      target: 'components/ui/button.tsx',
      content: BUTTON,
    },
  ],
}

const signIn = {
  name: 'sign-in',
  type: 'registry:block',
  title: 'Sign in',
  description: 'Email and password screen with a submit button.',
  dependencies: [],
  registryDependencies: ['button'],
  files: [
    {
      path: 'registry/blocks/sign-in.tsx',
      type: 'registry:block',
      target: 'components/blocks/sign-in.tsx',
      content: SIGN_IN,
    },
    {
      path: 'registry/blocks/sign-in/fields.tsx',
      type: 'registry:block',
      target: 'components/blocks/sign-in/fields.tsx',
      content: 'export const fields = []\n',
    },
  ],
}

/** A registry folder shaped like `registry/dist`, with one component and one block. */
async function blockRegistry(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'eoria-registry-'))
  const items = [button, signIn]
  for (const item of items) await writeFile(join(dir, `${item.name}.json`), JSON.stringify(item))
  const index = {
    name: 'eoria',
    items: items.map((item) => ({
      ...item,
      files: item.files.map(({ content: _content, ...file }) => file),
    })),
  }
  await writeFile(join(dir, 'index.json'), JSON.stringify(index))
  return dir
}

async function project(registry: string, config: Partial<EoriaConfig> = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'app', dependencies: {} }))
  await mkdir(join(root, 'src'), { recursive: true })
  await writeConfig(root, { ...defaultConfig, registry, ...config })
  return root
}

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

const block = { path: 'x', target: 'components/blocks/sign-in.tsx' }

test('blocks land next to the components directory unless eoria.json names a folder', () => {
  expect(blocksDirectory({ components: 'src/components/ui' })).toBe('src/components/blocks')
  expect(localPath({ components: 'src/components/ui' }, block)).toBe(
    'src/components/blocks/sign-in.tsx',
  )
  // The components directory does not have to be called `ui`.
  expect(localPath({ components: 'src/widgets' }, block)).toBe('src/blocks/sign-in.tsx')
  expect(localPath({ components: 'src/components/ui/' }, block)).toBe(
    'src/components/blocks/sign-in.tsx',
  )
  expect(localPath({ components: 'ui' }, block)).toBe('blocks/sign-in.tsx')
  // A bare components directory, as callers passed before blocks existed.
  expect(localPath('app/ui', block)).toBe('app/blocks/sign-in.tsx')

  const override = { components: 'src/components/ui', blocks: 'src/screens' }
  expect(blocksDirectory(override)).toBe('src/screens')
  expect(localPath(override, block)).toBe('src/screens/sign-in.tsx')
  expect(localPath({ components: 'src/ui', blocks: 'src\\screens' }, block)).toBe(
    'src/screens/sign-in.tsx',
  )
  // An empty override counts as none.
  expect(localPath({ components: 'src/ui', blocks: '' }, block)).toBe('src/blocks/sign-in.tsx')
  // The override moves blocks only.
  expect(localPath(override, { path: 'x', target: 'components/ui/button.tsx' })).toBe(
    'src/components/ui/button.tsx',
  )
})

test('block paths keep subfolders and cannot leave the blocks directory', () => {
  const config = { components: 'src/components/ui' }
  expect(localPath(config, { path: 'x', target: 'components/blocks/auth/sign-in.tsx' })).toBe(
    'src/components/blocks/auth/sign-in.tsx',
  )
  expect(localPath(config, { path: 'x', target: 'components\\blocks\\auth\\sign-in.tsx' })).toBe(
    'src/components/blocks/auth/sign-in.tsx',
  )
  expect(() =>
    localPath(config, { path: 'x', target: 'components/blocks/../../evil.tsx' }),
  ).toThrow(/outside the blocks directory/)
  expect(() =>
    localPath(config, { path: 'x', target: 'components/blocks/../ui/button.tsx' }),
  ).toThrow()
  expect(() => localPath(config, { path: 'x', target: 'components/blocks//etc/passwd' })).toThrow()
  expect(() => localPath(config, { path: 'x', target: 'components/ui/../../evil.tsx' })).toThrow(
    /outside the components directory/,
  )
})

test('add writes a block and the component it needs to their own folders', async () => {
  const registry = await blockRegistry()
  const root = await project(registry, { components: 'src/ui', alias: '~/ui' })
  const config = (await readConfig(root))!

  const plan = await planAdd(root, config, ['sign-in'])
  expect(plan.items).toEqual(['button', 'sign-in'])
  expect(plan.pulled).toEqual(['button'])
  expect(plan.files.map((file) => [file.item, file.target, file.action])).toEqual([
    ['button', 'src/ui/button.tsx', 'write'],
    ['sign-in', 'src/blocks/sign-in.tsx', 'write'],
    ['sign-in', 'src/blocks/sign-in/fields.tsx', 'write'],
  ])

  const text = await capture(() => add(root, ['sign-in'], { install: false }))
  expect(text).toContain('src/ui/button.tsx')
  expect(text).toContain('src/blocks/sign-in.tsx')

  expect(await readFile(join(root, 'src/ui/button.tsx'), 'utf8')).toBe(BUTTON)
  // The block imports the component through the project's alias.
  expect(await readFile(join(root, 'src/blocks/sign-in.tsx'), 'utf8')).toContain(
    "from '~/ui/button'",
  )
  expect(existsSync(join(root, 'src/blocks/sign-in/fields.tsx'))).toBe(true)
  expect(existsSync(join(root, 'src/ui/sign-in.tsx'))).toBe(false)

  const written = (await readConfig(root))!
  expect(Object.keys(written.installed)).toEqual(['button', 'sign-in'])
  expect(Object.keys(written.installed.button!)).toEqual(['src/ui/button.tsx'])
  expect(Object.keys(written.installed['sign-in']!)).toEqual([
    'src/blocks/sign-in.tsx',
    'src/blocks/sign-in/fields.tsx',
  ])
  // `add` does not write a `blocks` key the project never had.
  expect(written.blocks).toBeUndefined()

  const again = await planAdd(root, written, ['sign-in'])
  expect(again.files.map((file) => file.action)).toEqual(['same', 'same', 'same'])
})

test('a blocks key in eoria.json moves blocks and survives add', async () => {
  const registry = await blockRegistry()
  const root = await project(registry, { blocks: 'src/screens' })

  await capture(() => add(root, ['button', 'sign-in'], { install: false }))
  expect(existsSync(join(root, 'src/components/ui/button.tsx'))).toBe(true)
  expect(existsSync(join(root, 'src/screens/sign-in.tsx'))).toBe(true)
  expect(existsSync(join(root, 'src/components/blocks'))).toBe(false)

  const config = (await readConfig(root))!
  expect(config.blocks).toBe('src/screens')
  expect(Object.keys(config.installed['sign-in']!)).toContain('src/screens/sign-in.tsx')
})

test('view, diff, info and doctor follow a block to its folder', async () => {
  const registry = await blockRegistry()
  const root = await project(registry)
  await capture(() => add(root, ['sign-in'], { install: false }))

  const viewed = await viewItem(root, 'sign-in')
  expect(viewed.type).toBe('registry:block')
  expect(viewed.allRegistryDependencies).toEqual(['button'])
  expect(viewed.files.map((file) => file.localPath)).toEqual([
    'src/components/blocks/sign-in.tsx',
    'src/components/blocks/sign-in/fields.tsx',
  ])

  expect(await capture(() => diff(root, undefined, {}))).toContain('Everything matches')
  await writeFile(join(root, 'src/components/blocks/sign-in.tsx'), `${SIGN_IN}// mine\n`)
  expect(await capture(() => diff(root, 'sign-in', {}))).toMatch(
    /sign-in\s+src\/components\/blocks\/sign-in\.tsx/,
  )

  const result = await projectInfo(root)
  expect(result.blocks).toEqual({ directory: 'src/components/blocks', exists: true })
  expect(result.installed.map((item) => item.name)).toEqual(['button', 'sign-in'])
  expect(result.installed[1]!.files).toEqual([
    { path: 'src/components/blocks/sign-in.tsx', status: 'local', label: 'edited locally' },
    { path: 'src/components/blocks/sign-in/fields.tsx', status: 'unchanged', label: 'up to date' },
  ])
  const text = await capture(() => info(root, {}))
  expect(text).toMatch(/^blocks\s+src\/components\/blocks$/m)
  expect(text).toMatch(/sign-in\s+src\/components\/blocks\/sign-in\.tsx\s+edited locally/)

  const report = await runDoctor(root)
  const check = (id: string) => report.checks.find((entry) => entry.id === id)
  expect(check('installed-files')?.status).toBe('pass')
  expect(check('registry-dependencies')?.status).toBe('pass')
})

test('list and search print the type and --type keeps one', async () => {
  const registry = await blockRegistry()
  const root = await project(registry)

  const all = await listItems(root)
  expect(all.items.map((item) => [item.name, item.type])).toEqual([
    ['button', 'registry:ui'],
    ['sign-in', 'registry:block'],
  ])
  expect((await listItems(root, { type: 'block' })).items.map((item) => item.name)).toEqual([
    'sign-in',
  ])
  expect((await listItems(root, { type: 'ui' })).items.map((item) => item.name)).toEqual(['button'])
  await expect(listItems(root, { type: 'screen' })).rejects.toThrow('--type takes ui or block')

  const text = await capture(() => list(root, {}))
  expect(text).toMatch(/^ {2}button\s+ui\s+Button\s+Pressable/m)
  expect(text).toMatch(/^ {2}sign-in\s+block\s+Sign in\s+Email/m)
  const blocks = await capture(() => list(root, { type: 'block' }))
  expect(blocks).not.toMatch(/^ {2}button/m)
  expect(blocks).toContain('1 items')

  const json = JSON.parse(await capture(() => list(root, { type: 'block', json: true })))
  expect(json.items).toEqual([
    {
      name: 'sign-in',
      title: 'Sign in',
      description: signIn.description,
      type: 'registry:block',
      installed: false,
    },
  ])

  // Both items mention a button.
  expect((await searchItems(root, 'button')).items.map((item) => item.name)).toEqual([
    'button',
    'sign-in',
  ])
  expect(
    (await searchItems(root, 'button', { type: 'block' })).items.map((item) => item.name),
  ).toEqual(['sign-in'])
  const found = JSON.parse(await capture(() => search(root, 'button', { type: 'ui', json: true })))
  expect(found.items.map((item: { name: string; type: string }) => [item.name, item.type])).toEqual(
    [['button', 'registry:ui']],
  )
  expect(await capture(() => search(root, 'button', { type: 'block' }))).toMatch(
    /^ {2}sign-in\s+block\s+/m,
  )
})

test('the MCP tools filter by type and report block paths', async () => {
  const registry = await blockRegistry()
  const root = await project(registry)
  const input = new PassThrough()
  const output = new PassThrough()
  const server = createMcpServer({ root, input, output })
  let rest = ''
  const replies = new Map<number, (text: string) => void>()
  output.on('data', (chunk: Buffer) => {
    const lines = (rest + chunk.toString('utf8')).split('\n')
    rest = lines.pop() ?? ''
    for (const line of lines) {
      const reply = JSON.parse(line)
      replies.get(reply.id)?.(reply.result.content[0].text)
    }
  })
  let nextId = 1
  const call = (name: string, args: Record<string, unknown>) =>
    new Promise<string>((done) => {
      const id = nextId++
      replies.set(id, done)
      const params = { name, arguments: args }
      input.write(`${JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params })}\n`)
    })

  const listed = JSON.parse(await call('list_components', { type: 'block' }))
  expect(
    listed.items.map((item: { name: string; type: string }) => [item.name, item.type]),
  ).toEqual([['sign-in', 'registry:block']])
  const found = JSON.parse(await call('search_components', { query: 'button', type: 'ui' }))
  expect(found.items.map((item: { name: string }) => item.name)).toEqual(['button'])
  expect(await call('list_components', { type: 'screen' })).toContain(
    '"type" must be one of ui, block.',
  )

  const viewed = JSON.parse(await call('view_component', { name: 'sign-in' }))
  expect(viewed.files[0].localPath).toBe('src/components/blocks/sign-in.tsx')

  const plan = JSON.parse(await call('add_components', { names: ['sign-in'], dryRun: true }))
  expect(plan.files.map((file: { target: string }) => file.target)).toEqual([
    'src/components/ui/button.tsx',
    'src/components/blocks/sign-in.tsx',
    'src/components/blocks/sign-in/fields.tsx',
  ])
  const added = JSON.parse(await call('add_components', { names: ['sign-in'] }))
  expect(added.written).toEqual(plan.files.map((file: { target: string }) => file.target))
  expect(existsSync(join(root, 'src/components/blocks/sign-in.tsx'))).toBe(true)

  input.end()
  await server.closed
})
