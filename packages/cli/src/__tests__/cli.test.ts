import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { diffLines, formatDiff } from '../diff'
import { rewriteAlias, kebabCase, pascalCase } from '../files'
import { Registry } from '../registry'
import { add } from '../commands/add'
import { extend } from '../commands/extend'
import { ensureThemeImport } from '../commands/init'
import { writeConfig, defaultConfig, aliasToDirectory } from '../config'
import { findMainFile, findThemeImport } from '../setup'

const registryDir = resolve(__dirname, '../../../../registry/dist')
const hasRegistry = existsSync(join(registryDir, 'index.json'))

test('diff marks added and removed lines', () => {
  const out = formatDiff(diffLines('a\nb\nc', 'a\nc\nd'), 0)
  expect(out).toEqual(['- b', '…', '+ d'])
})

test('rewriteAlias only touches the registry alias', () => {
  const src = "import { Text } from '@/components/ui/text'\nimport x from '@/lib/x'"
  expect(rewriteAlias(src, '~/ui')).toBe(
    "import { Text } from '~/ui/text'\nimport x from '@/lib/x'",
  )
  expect(rewriteAlias(src, '@/components/ui')).toBe(src)
})

test('case helpers', () => {
  expect(kebabCase('CheckoutButton')).toBe('checkout-button')
  expect(pascalCase('checkout-button')).toBe('CheckoutButton')
})

test('aliasToDirectory reads tsconfig paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  await writeFile(
    join(root, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { paths: { '~/*': ['./app/*'] } } }),
  )
  expect(await aliasToDirectory(root, '~/components/ui')).toBe('app/components/ui')
  expect(await aliasToDirectory(root, '@/components/ui')).toBe('src/components/ui')
})

const maybe = hasRegistry ? test : test.skip

maybe('resolve orders dependencies first and once', async () => {
  const registry = new Registry(registryDir)
  const items = await registry.resolve(['select', 'button'])
  const names = items.map((i) => i.name)
  expect(names.indexOf('text')).toBeLessThan(names.indexOf('button'))
  expect(names.indexOf('popper')).toBeLessThan(names.indexOf('select'))
  expect(new Set(names).size).toBe(names.length)
})

maybe('add copies files, records hashes, and extend generates a derived file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'app', dependencies: {} }))
  await mkdir(join(root, 'src'), { recursive: true })
  await writeConfig(root, {
    ...defaultConfig,
    registry: registryDir,
    alias: '~/ui',
    components: 'src/ui',
  })

  await add(root, ['button'], { install: false })
  const button = await readFile(join(root, 'src/ui/button.tsx'), 'utf8')
  expect(button).toContain("from '~/ui/text'")
  expect(existsSync(join(root, 'src/ui/text.tsx'))).toBe(true)
  const config = JSON.parse(await readFile(join(root, 'eoria.json'), 'utf8'))
  expect(Object.keys(config.installed)).toEqual(expect.arrayContaining(['text', 'button']))

  await writeFile(join(root, 'src/ui/button.tsx'), button + '\n// edited')
  await add(root, ['button'], { install: false })
  expect(await readFile(join(root, 'src/ui/button.tsx'), 'utf8')).toContain('// edited')
  await add(root, ['button'], { install: false, overwrite: true })
  expect(await readFile(join(root, 'src/ui/button.tsx'), 'utf8')).toBe(button)

  await extend(root, 'button', 'checkout-button', {})
  const derived = await readFile(join(root, 'src/ui/checkout-button.tsx'), 'utf8')
  expect(derived).toContain("from '~/ui/button'")
  expect(derived).toContain('createButton(checkoutButtonRecipe)')
})

test('localPath keeps subfolders under the registry prefix and rejects escapes', async () => {
  const { localPath, assertPlainName } = await import('../files')
  expect(
    localPath('src/ui', { path: 'registry/ui/button.tsx', target: 'components/ui/button.tsx' }),
  ).toBe('src/ui/button.tsx')
  expect(localPath('src/ui', { path: 'x', target: 'components/ui/select/index.tsx' })).toBe(
    'src/ui/select/index.tsx',
  )
  expect(() => localPath('src/ui', { path: 'x', target: 'components/ui/../../evil.tsx' })).toThrow()
  expect(() => assertPlainName('../../evil', 'name')).toThrow()
  expect(() => assertPlainName('checkout-button', 'name')).not.toThrow()
})

test('ensureThemeImport prepends the import to the root layout once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  await mkdir(join(root, 'src/app'), { recursive: true })
  const layout =
    "import { Stack } from 'expo-router';\n\nexport default function Layout() {\n  return <Stack />;\n}\n"
  await writeFile(join(root, 'src/app/_layout.tsx'), layout)
  const config = { ...defaultConfig, alias: '@/components/ui', components: 'src/components/ui' }

  await ensureThemeImport(root, 'src', config)
  const once = await readFile(join(root, 'src/app/_layout.tsx'), 'utf8')
  expect(once).toBe(`import '@/unistyles';\n${layout}`)

  await ensureThemeImport(root, 'src', config)
  expect(await readFile(join(root, 'src/app/_layout.tsx'), 'utf8')).toBe(once)

  await writeFile(join(root, 'App.tsx'), 'export default function App() {}\n')
  await ensureThemeImport(root, 'src', { ...config, alias: 'components/ui' })
  expect(await readFile(join(root, 'src/app/_layout.tsx'), 'utf8')).toBe(once)
})

test('ensureThemeImport accepts the import in the custom entry that main points to', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  await mkdir(join(root, 'src/app'), { recursive: true })
  const layout = "import { Stack } from 'expo-router'\n"
  await writeFile(join(root, 'src/app/_layout.tsx'), layout)
  await writeFile(join(root, 'index.ts'), "import 'expo-router/entry'\nimport './src/unistyles'\n")
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'app', main: 'index.ts' }))
  const config = { ...defaultConfig, alias: '@/components/ui', components: 'src/components/ui' }

  expect(await findThemeImport(root, 'src')).toEqual({
    target: 'src/app/_layout.tsx',
    importedBy: 'index.ts',
  })
  expect(await ensureThemeImport(root, 'src', config)).toBeUndefined()
  expect(await readFile(join(root, 'src/app/_layout.tsx'), 'utf8')).toBe(layout)

  // The stock Expo Router entry is a package, not a project file, so the layout gets the import.
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ name: 'app', main: 'expo-router/entry' }),
  )
  expect(await findThemeImport(root, 'src')).toEqual({ target: 'src/app/_layout.tsx' })
  expect(await ensureThemeImport(root, 'src', config)).toBe('src/app/_layout.tsx')
})

test('findMainFile resolves main to a project file only', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  const main = async (value?: string) => {
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'app', main: value }))
    return findMainFile(root)
  }
  await writeFile(join(root, 'index.js'), "import './src/unistyles'\n")
  await mkdir(join(root, 'node_modules/expo-router'), { recursive: true })
  await writeFile(join(root, 'node_modules/expo-router/entry.js'), '')

  expect(await main('index.js')).toBe('index.js')
  expect(await main('./index')).toBe('index.js')
  expect(await main(undefined)).toBeUndefined()
  expect(await main('expo-router/entry')).toBeUndefined()
  expect(await main('node_modules/expo-router/entry')).toBeUndefined()
  expect(await main('../index.js')).toBeUndefined()
  await writeFile(join(root, 'package.json'), '{ not json')
  expect(findMainFile(root)).toBeUndefined()
})
