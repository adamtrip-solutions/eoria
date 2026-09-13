// Emits a static, shadcn-compatible registry into registry/dist:
//   index.json         every item, without file contents
//   <name>.json        one item with file contents inlined
// Deploy the folder as-is to any static host.
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'registry/dist')
const registry = JSON.parse(await readFile(resolve(root, 'registry/registry.json'), 'utf8'))

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

const names = new Set(registry.items.map((item) => item.name))
for (const item of registry.items) {
  for (const dep of item.registryDependencies ?? []) {
    if (!names.has(dep)) throw new Error(`${item.name}: unknown registryDependency "${dep}"`)
  }
  const files = await Promise.all(
    item.files.map(async (file) => ({
      ...file,
      content: await readFile(resolve(root, file.path), 'utf8'),
    })),
  )
  await writeFile(
    resolve(out, `${item.name}.json`),
    JSON.stringify(
      { $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...item, files },
      null,
      2,
    ),
  )
}

await writeFile(
  resolve(out, 'index.json'),
  JSON.stringify(
    {
      ...registry,
      items: registry.items.map(({ files, ...rest }) => ({
        ...rest,
        files: files.map(({ path, type, target }) => ({ path, type, target })),
      })),
    },
    null,
    2,
  ),
)
console.log(`registry: wrote ${registry.items.length} items to registry/dist`)
