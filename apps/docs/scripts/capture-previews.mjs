// Screenshots every /preview/<name> route of the example app on the booted iOS
// simulator, in light and dark, and writes compressed images to public/previews.
// Needs: a booted simulator with the example dev build open and Metro running.
// The app polls http://localhost:8765/ (see apps/example/src/preview-driver.ts)
// and navigates to whatever this script names.
//   node scripts/capture-previews.mjs [name...]
import { execFileSync } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import sharp from 'sharp'

const docs = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(docs, 'public/previews')
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'))

const contentDir = resolve(docs, 'src/content/docs/components')
const names =
  wanted.length > 0
    ? wanted
    : (await readdir(contentDir)).filter((f) => f.endsWith('.mdx')).map((f) => f.slice(0, -4))

const simctl = (...a) => execFileSync('xcrun', ['simctl', ...a], { stdio: 'pipe' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let current = { name: '', seq: 0 }
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
simctl('launch', 'booted', bundleId)
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

await mkdir(out, { recursive: true })
try {
  for (const mode of ['light', 'dark']) {
    simctl('ui', 'booted', 'appearance', mode)
    await sleep(400)
    for (const name of names) {
      current = { name, seq: current.seq + 1 }
      await sleep(name === 'toast' || name === 'progress' ? 2200 : 1600)
      const raw = resolve(tmpdir(), `eoria-${name}-${mode}.png`)
      simctl('io', 'booted', 'screenshot', raw)
      const png = await readFile(raw)
      const image = sharp(png)
      const { width, height } = await image.metadata()
      // The dev client draws a floating button top-right. Paint it out with the
      // background colour sampled from the same row, well inside the padded canvas.
      const probe = await image
        .clone()
        .extract({ left: 8, top: Math.round(height * 0.13), width: 1, height: 1 })
        .raw()
        .toBuffer()
      const bg = { r: probe[0], g: probe[1], b: probe[2] }
      const patch = await sharp({
        create: {
          width: Math.round(width * 0.16),
          height: Math.round(height * 0.08),
          channels: 3,
          background: bg,
        },
      })
        .png()
        .toBuffer()
      // Composite first, then resize in a second pass: sharp resizes before it composites.
      const patched = await image
        .composite([
          { input: patch, left: Math.round(width * 0.82), top: Math.round(height * 0.085) },
        ])
        .png()
        .toBuffer()
      const webp = await sharp(patched).resize({ width: 640 }).webp({ quality: 82 }).toBuffer()
      await writeFile(resolve(out, `${name}-${mode}.webp`), webp)
      console.log(`${name}-${mode}.webp ${Math.round(webp.length / 1024)}kB (${width}x${height})`)
    }
  }
} finally {
  simctl('status_bar', 'booted', 'clear')
  simctl('ui', 'booted', 'appearance', 'light')
  server.close()
}
