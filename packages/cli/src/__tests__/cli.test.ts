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
