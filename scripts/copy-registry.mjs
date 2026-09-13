// Copies the built registry into the docs site so it is served from /r/*.json.
import { cp, mkdir, rm, access } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'registry/dist')
const dest = resolve(root, 'apps/docs/public/r')

try {
  await access(src)
} catch {
  throw new Error('registry/dist is missing. Run `pnpm build:registry` first.')
}
await rm(dest, { recursive: true, force: true })
await mkdir(dirname(dest), { recursive: true })
await cp(src, dest, { recursive: true })
console.log('docs: copied registry to apps/docs/public/r')
