import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'
import {
  markdown,
  parser as mdx,
  renderAgentDoc,
  renderAgentIndex,
} from '../src/lib/agent-docs.mjs'

const site = 'https://eoria.adamtrip.pt/'
const ids = new Set(['start/installation', 'start/recipes', 'components/button'])
const doc = (body) => ({ id: 'components/button', title: 'Button', description: 'A button.', body })

function nodes(tree, type) {
  return [tree, ...(tree.children ?? []).flatMap((child) => nodes(child, type))].filter(
    (node) => node.type === type,
  )
}

test('exports tab commands and step contents while preserving TSX and tables', () => {
  const input = [
    "import Steps from './Steps.astro'",
    "import CommandTabs from './CommandTabs.astro'",
    '',
    '<Steps>',
    '',
    '1. Install the component.',
    '',
    "   <CommandTabs items={[{label: 'npm', command: 'npx @eoria/cli add button'}]} />",
    '',
    '</Steps>',
    '',
    '```tsx',
    "import { Button } from '@/components/ui/button'",
    '<Button styles={{ root: { opacity: 0.5 } }}>Save</Button>',
    '```',
    '',
    '| Prop | Default |',
    '| --- | --- |',
    '| size | md |',
  ].join('\n')
  const result = markdown.parse(renderAgentDoc(doc(input), ids, site))
  const code = nodes(result, 'code')
  assert.equal(code[0].value, 'npx @eoria/cli add button')
  assert.equal(code[1].value, nodes(mdx.parse(input), 'code')[0].value)
  assert.equal(nodes(result, 'table').length, 1)
  assert.equal(nodes(result, 'list').length, 1)
  assert.equal(nodes(result, 'html').length, 0)
})

test('rewrites documentation links, preserves fragments, and leaves code untouched', () => {
  const input =
    '[Recipes](/start/recipes/#extending) [Install](../start/installation/)\n\n' +
    '```tsx\nconst url = "/start/recipes/"\n```'
  // Relative URLs follow the HTML page location, not the generated .md location.
  const output = renderAgentDoc(doc(input.replace('../start/', '../../start/')), ids, site)
  const urls = nodes(markdown.parse(output), 'link').map((node) => node.url)
  assert.ok(urls.includes(`${site}start/recipes.md#extending`))
  assert.ok(urls.includes(`${site}start/installation.md`))
  assert.ok(output.includes('const url = "/start/recipes/"'))
  assert.throws(
    () => renderAgentDoc(doc('[Missing](/components/missing/)'), ids, site),
    /unknown documentation link/,
  )
  // Sections come from the page ids, so links outside them pass through untouched.
  assert.ok(
    renderAgentDoc(doc('[Index](/r/index.json)'), ids, site).includes(`${site}r/index.json`),
  )
})

test('makes assets absolute without validating them as pages', () => {
  const output = renderAgentDoc(
    doc('![Shot](./shot.png) [File](/components/button/spec.pdf)'),
    ids,
    site,
  )
  assert.ok(output.includes(`![Shot](${site}components/button/shot.png)`))
  assert.ok(output.includes(`${site}components/button/spec.pdf`))
})

test('keeps autolink text in step with the rewritten target', () => {
  const output = renderAgentDoc(doc(`See ${site}start/recipes/ now.`), ids, site)
  assert.ok(output.includes(`${site}start/recipes.md`))
  assert.ok(!output.includes(`${site}start/recipes/`))
})

test('fails on unsupported or executable MDX rather than silently dropping content', () => {
  const tabs = "<CommandTabs items={[{label: 'a', command: 'b'}]}>\n\nA note.\n\n</CommandTabs>"
  for (const body of [
    '<NewWidget />',
    '{calculate()}',
    '<CommandTabs items={getCommands()} />',
    tabs,
  ]) {
    assert.throws(() => renderAgentDoc(doc(body), ids, site))
  }
})

test('every repository page converts without losing its fenced examples', async () => {
  const base = new URL('../src/content/docs/', import.meta.url)
  const paths = (await readdir(base, { recursive: true }))
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.endsWith('.mdx'))
  const idOf = (path) => path.replace(/\.mdx$/, '')
  const allIds = new Set(paths.map(idOf))
  const registry = JSON.parse(
    await readFile(new URL('../../../registry/registry.json', import.meta.url), 'utf8'),
  )
  // Blocks are documented under blocks/, every other item under components/.
  for (const item of registry.items) {
    const section = item.type === 'registry:block' ? 'blocks' : 'components'
    assert.ok(allIds.has(`${section}/${item.name}`), item.name)
  }
  for (const path of paths) {
    const source = await readFile(new URL(path, base), 'utf8')
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    const id = idOf(path)
    const result = markdown.parse(renderAgentDoc({ ...doc(body), id }, allIds, site))
    const exported = nodes(result, 'code').map(({ lang, value }) => ({ lang, value }))
    for (const { lang, value } of nodes(mdx.parse(body), 'code')) {
      assert.ok(
        exported.some((code) => code.lang === lang && code.value === value),
        `${id}: lost example`,
      )
    }
    assert.equal(nodes(result, 'html').length, 0, id)
  }
})

test('the index links every supplied page once, plus the distributed skill and registry', () => {
  const entries = [...ids].map((id) => ({
    id,
    data: { title: id, description: 'Reference.', category: 'Forms' },
  }))
  const links = nodes(markdown.parse(renderAgentIndex(entries, site)), 'link').map(
    (node) => node.url,
  )
  for (const id of ids) assert.equal(links.filter((url) => url === `${site}${id}.md`).length, 1)
  assert.ok(links.includes(`${site}skills/eoria/SKILL.md`))
  assert.ok(links.includes(`${site}r/index.json`))
})

test('the index rejects pages the sidebar would not show', () => {
  const entries = [{ id: 'guides/x', data: { title: 'x', description: 'd' } }]
  assert.throws(() => renderAgentIndex(entries, site), /outside a known section/)
})
