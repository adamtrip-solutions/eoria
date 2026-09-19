// Turns the CHANGELOG.md that release-please keeps for each package into a docs page, so the
// site never has a second copy to maintain. Runs before every build. The pages are generated
// and git-ignored. changelog/registry.mdx is the one page written by hand.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(app, 'src/content/docs/changelog')

const packages = [
  {
    dir: 'core',
    name: '@eoria/core',
    order: 2,
    description: 'Releases of the recipe engine and the theme tokens.',
  },
  {
    dir: 'cli',
    name: '@eoria/cli',
    order: 3,
    description: 'Releases of the CLI and its MCP server.',
  },
]

/**
 * release-please writes plain Markdown and the docs read MDX, where `<`, `{` and `}` start
 * syntax. A commit subject such as "add <Sheet>" would break the build, so escape them
 * outside inline code.
 */
const escapeMdx = (line) =>
  line
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/[<{}]/g, (c) => `\\${c}`)))
    .join('')

await mkdir(out, { recursive: true })
for (const pkg of packages) {
  const source = await readFile(resolve(app, '../../packages', pkg.dir, 'CHANGELOG.md'), 'utf8')
  const body = source
    .replace(/^# Changelog\s*/, '')
    .split('\n')
    .map(escapeMdx)
    // "## [0.2.0](compare) (2026-09-19)" reads better in the table of contents as "0.2.0".
    .map((line) =>
      line.replace(/^## \[([^\]]+)\]\(([^)]+)\) \(([^)]+)\)$/, '## $1\n\n$3 · [Compare]($2)'),
    )
    .map((line) => line.replace(/^## ([\d.]+) \(([^)]+)\)$/, '## $1\n\n$2'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const page = [
    '---',
    `title: '${pkg.name}'`,
    `description: ${pkg.description}`,
    'sidebar:',
    `  order: ${pkg.order}`,
    '---',
    '',
    `Generated from [\`packages/${pkg.dir}/CHANGELOG.md\`](https://github.com/adamtrip-solutions/eoria/blob/main/packages/${pkg.dir}/CHANGELOG.md). Get the newest release with \`npm install ${pkg.name}@latest\`.`,
    '',
    body,
    '',
  ].join('\n')
  await writeFile(resolve(out, `${pkg.dir}.mdx`), page)
}
console.log(`changelog: wrote ${packages.map((p) => `${p.dir}.mdx`).join(', ')}`)
