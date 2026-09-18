// Screenshots every /preview/<name> route of the example app on the booted iOS
// simulator, in light and dark, and writes compressed images to public/previews.
// Names with a slash (showcase/wallet) are full app routes, captured with their
// header and written to public/screens by their last segment.
// Needs: a booted simulator with the example dev build open and Metro running.
// The app polls http://localhost:8765/ (see apps/example/src/preview-driver.ts)
// and navigates to whatever this script names.
//   node scripts/capture-previews.mjs [name...] [--preset=<name>] [--out=<dir>]
// --preset captures in another preset (default zinc). --out writes every image to one
// directory instead of public/, for review shots that should not land in the site.
import { execFileSync } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import sharp from 'sharp'

const docs = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const flag = (key) =>
  process.argv
    .slice(2)
    .find((a) => a.startsWith(`--${key}=`))
    ?.slice(key.length + 3)
const preset = flag('preset') ?? 'zinc'
const outDir = flag('out')
const outFor = (name) =>
  outDir
    ? resolve(outDir)
    : resolve(docs, name.includes('/') ? 'public/screens' : 'public/previews')
const fileFor = (name) => name.slice(name.lastIndexOf('/') + 1)
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'))

// Every component and block page has a preview of the same name. The blocks overview has none.
const pages = async (section) =>
  (await readdir(resolve(docs, 'src/content/docs', section)))
    .filter((f) => f.endsWith('.mdx') && f !== 'overview.mdx')
    .map((f) => f.slice(0, -4))
const names =
  wanted.length > 0 ? wanted : [...(await pages('components')), ...(await pages('blocks'))]

const simctl = (...a) => execFileSync('xcrun', ['simctl', ...a], { stdio: 'pipe' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let current = { name: '', seq: 0, preset }
const server = createServer((_req, res) => {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(current))
})
await new Promise((r) => server.listen(8765, r))

// A Metro reload leaves expo-router on an unmatched route that navigation cannot
// leave, so start from a fresh launch every time.
const bundleId = process.env.EORIA_BUNDLE_ID ?? 'pt.adamtrip.eoria.example'
try {
  simctl('terminate', 'booted', bundleId)
} catch {
  // Not running.
}
// A fresh dev client covers the first screen with its menu's welcome sheet, and every dev
// client floats a menu button over the top right corner. Both are user defaults.
const defaults = (...a) => simctl('spawn', 'booted', 'defaults', ...a)
defaults('write', bundleId, 'EXDevMenuIsOnboardingFinished', '-bool', 'YES')
defaults('write', bundleId, 'EXDevMenuShowFloatingActionButton', '-bool', 'NO')
// A dev client opens its launcher unless it is told which server to load. The launch
// argument does that without the "Open in app?" prompt a deep link brings up.
const metro = process.env.EORIA_METRO_URL ?? 'http://localhost:8081'
simctl('launch', 'booted', bundleId, '--initialUrl', metro)
simctl(
  'status_bar',
  'booted',
  'override',
  '--time',
  '9:41',
  '--batteryLevel',
  '100',
  '--wifiBars',
  '3',
  '--cellularBars',
  '4',
)
await sleep(10000)

for (const name of names) await mkdir(outFor(name), { recursive: true })
try {
  for (const mode of ['light', 'dark']) {
    simctl('ui', 'booted', 'appearance', mode)
    await sleep(400)
    for (const name of names) {
      current = { name, seq: current.seq + 1, preset }
      await sleep(name === 'toast' || name === 'progress' ? 2200 : 1600)
      const raw = resolve(tmpdir(), `eoria-${fileFor(name)}-${mode}.png`)
      simctl('io', 'booted', 'screenshot', raw)
      const png = await readFile(raw)
      const { width, height } = await sharp(png).metadata()
      const webp = await sharp(png).resize({ width: 640 }).webp({ quality: 82 }).toBuffer()
      await writeFile(resolve(outFor(name), `${fileFor(name)}-${mode}.webp`), webp)
      console.log(
        `${fileFor(name)}-${mode}.webp ${Math.round(webp.length / 1024)}kB (${width}x${height})`,
      )
    }
  }
} finally {
  defaults('delete', bundleId, 'EXDevMenuShowFloatingActionButton')
  simctl('status_bar', 'booted', 'clear')
  simctl('ui', 'booted', 'appearance', 'light')
  server.close()
}
