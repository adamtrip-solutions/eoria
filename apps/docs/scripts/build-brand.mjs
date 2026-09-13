// Generates the favicon set and the Open Graph image into public/.
// Run by hand after changing the mark or the tagline: pnpm --filter docs brand
// The outputs are committed, because SVG text rendering depends on the fonts of the machine.
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const pub = resolve(import.meta.dirname, '../public')
const mark = await readFile(resolve(pub, 'favicon.svg'))

for (const [name, size] of [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  await sharp(mark, { density: 72 * (size / 32) * 2 })
    .resize(size, size)
    .png()
    .toFile(resolve(pub, name))
}

// Open Graph, 1200x630. Wordmark and tagline left, a phone screenshot bleeding off the bottom right.
const W = 1200
const H = 630
const bg = '#0a0a0a'
const fg = '#fafafa'
const muted = '#a3a3a3'
const font = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="80" y="88" width="72" height="72" rx="22" fill="${fg}"/>
  <rect x="100" y="108" width="32" height="32" rx="10" fill="${bg}"/>
  <text x="172" y="150" font-family="${font}" font-weight="700" font-size="76" letter-spacing="-2" fill="${fg}">eoria</text>
  <text font-family="${font}" font-weight="700" font-size="46" letter-spacing="-1" fill="${fg}">
    <tspan x="80" y="300">React Native components</tspan>
    <tspan x="80" y="356">that feel like the phone</tspan>
    <tspan x="80" y="412">they run on.</tspan>
  </text>
  <text font-family="${font}" font-size="26" fill="${muted}">
    <tspan x="80" y="490">Copy the source. Own it. Unistyles 3, Reanimated 4.</tspan>
  </text>
  <text x="80" y="560" font-family="${font}" font-weight="700" font-size="26" fill="${muted}">eoria.adamtrip.pt</text>
</svg>`

// Phone: screen 380 wide, frame drawn around it, top at y=70 so it runs off the bottom edge.
const screenW = 380
const screenX = 760
const screenY = 92
const radius = 52
const border = 12
const visibleH = H - screenY
const shot = await sharp(resolve(pub, 'previews/select-light.webp'))
  .resize({ width: screenW })
  .toBuffer()
const { height: screenH } = await sharp(shot).metadata()
const cropped = await sharp(shot)
  .extract({ left: 0, top: 0, width: screenW, height: visibleH })
  .toBuffer()
// The mask keeps the full phone height so only the top corners round; the bottom runs off the canvas.
const screenMask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${screenW}" height="${visibleH}"><rect width="${screenW}" height="${screenH}" rx="${radius}" fill="#fff"/></svg>`,
)
const screen = await sharp(cropped)
  .composite([{ input: screenMask, blend: 'dest-in' }])
  .png()
  .toBuffer()
const frame = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect x="${screenX - border}" y="${screenY - border}" width="${screenW + border * 2}" height="${screenH + border * 2}" rx="${radius + border}" fill="none" stroke="#3f3f46" stroke-width="${border}"/>
    <rect x="${screenX - border / 2}" y="${screenY - border / 2}" width="${screenW + border}" height="${screenH + border}" rx="${radius + border / 2}" fill="none" stroke="#18181b" stroke-width="2"/>
    <rect x="${screenX + screenW / 2 - 60}" y="${screenY + 14}" width="120" height="34" rx="17" fill="#000"/>
  </svg>`,
)

await sharp(Buffer.from(text))
  .composite([
    { input: screen, left: screenX, top: screenY },
    { input: frame, left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(resolve(pub, 'og.png'))

await writeFile(
  resolve(pub, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'eoria',
      short_name: 'eoria',
      description: 'Native-first React Native components you copy into your app.',
      start_url: '/',
      display: 'browser',
      background_color: '#0a0a0a',
      theme_color: '#0a0a0a',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  ) + '\n',
)
console.log('brand assets written')
