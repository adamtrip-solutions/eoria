// Turns a preset from @eoria/core into the TypeScript a reader can paste. The theming page
// and its Markdown twin print the same text.

const key = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`)
const string = (s) => (s.includes("'") ? JSON.stringify(s) : `'${s}'`)

function literal(value, indent) {
  if (typeof value === 'string') return string(value)
  if (typeof value !== 'object' || value === null) return String(value)
  const entries = Object.entries(value).filter(([, v]) => v !== undefined)
  const flat = entries.every(([, v]) => typeof v !== 'object' || v === null)
  const inline = `{ ${entries.map(([k, v]) => `${key(k)}: ${literal(v, indent)}`).join(', ')} }`
  // Short groups such as `control` and `shadow` read better on one line. Palettes do not.
  if (flat && inline.length + indent.length <= 88 && entries.length <= 8) return inline
  const inner = `${indent}  `
  const lines = entries.map(([k, v]) => `${inner}${key(k)}: ${literal(v, inner)},`)
  return `{\n${lines.join('\n')}\n${indent}}`
}

/** The two lines that use a shipped preset as it is. */
export const presetUsage = (name) =>
  [
    "import { configureUnistyles, createThemes, presets } from '@eoria/core'",
    '',
    `configureUnistyles({ themes: createThemes(presets.${name}) })`,
  ].join('\n')

/** The whole preset as an object of your own, ready to edit. */
export const presetSource = (name, preset) =>
  [
    "import { configureUnistyles, createThemes, type Preset } from '@eoria/core'",
    '',
    `// Copied from the ${name} preset. Change any value.`,
    `const brand: Preset = ${literal(preset, '')}`,
    '',
    'configureUnistyles({ themes: createThemes(brand) })',
  ].join('\n')
