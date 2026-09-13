// Copies registry sources into the example app. The registry is the source of
// truth; never edit apps/example/components/ui/<registry item> by hand.
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const registry = JSON.parse(await readFile(resolve(root, 'registry/registry.json'), 'utf8'))
const dest = resolve(root, 'apps/example/src')

for (const item of registry.items) {
  for (const file of item.files) {
    const target = resolve(dest, file.target)
    await mkdir(dirname(target), { recursive: true })
    await copyFile(resolve(root, file.path), target)
    console.log(`synced ${basename(file.path)} -> apps/example/src/${file.target}`)
  }
}
