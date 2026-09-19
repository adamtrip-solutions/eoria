import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import { groupDocs } from './docs-nav.mjs'

/** Parses documentation MDX. Exported so tests read sources with the same grammar. */
export const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMdx)
/** Parses the generated Markdown. */
export const markdown = unified().use(remarkParse).use(remarkGfm)
const writer = unified().use(remarkGfm).use(remarkStringify, { bullet: '-', fences: true })
const text = (value) => ({ type: 'text', value })
const paragraph = (value) => ({ type: 'paragraph', children: [text(value)] })
const heading = (depth, value) => ({ type: 'heading', depth, children: [text(value)] })
const link = (label, url) => ({ type: 'link', url, children: [text(label)] })

/**
 * Convert documentation links to absolute Markdown URLs, preserving query and fragment.
 * Page links into a documented section must exist; assets (images, files with an
 * extension) are only made absolute.
 */
function resolveLink(value, id, ids, site, page = true) {
  if (value.startsWith('#')) return value
  const url = new URL(value, new URL(`${id}/`, site))
  if (url.origin === new URL(site).origin) {
    const target = url.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\.md$/, '')
    const sections = new Set([...ids].map((known) => known.split('/')[0]))
    const isAsset = /\.[a-z0-9]+$/i.test(target)
    if (ids.has(target)) url.pathname = `/${target}.md`
    else if (page && !isAsset && sections.has(target.split('/')[0])) {
      throw new Error(`${id}: unknown documentation link ${value}`)
    }
  }
  return url.href
}

// Read only literal tab data. Never evaluate JavaScript from MDX.
function commandTabs(node) {
  const attribute = node.attributes.find((a) => a.name === 'items')
  const expression = attribute?.value?.data?.estree?.body?.[0]?.expression
  if (node.attributes.length !== 1 || expression?.type !== 'ArrayExpression') {
    throw new Error('CommandTabs requires a literal items array for Markdown export')
  }
  if (node.children.length > 0) {
    throw new Error('CommandTabs content is not exported; move it outside the tag')
  }
  return expression.elements.flatMap((item) => {
    if (item?.type !== 'ObjectExpression') throw new Error('Unsupported CommandTabs item')
    const values = new Map()
    for (const property of item.properties) {
      const key = property.key?.name ?? property.key?.value
      if (
        property.type !== 'Property' ||
        property.computed ||
        property.kind !== 'init' ||
        !['label', 'command'].includes(key) ||
        property.value.type !== 'Literal' ||
        typeof property.value.value !== 'string'
      ) {
        throw new Error('CommandTabs labels and commands must be literal strings')
      }
      values.set(key, property.value.value)
    }
    if (!values.has('label') || !values.has('command')) {
      throw new Error('CommandTabs item needs a label and command')
    }
    return [
      paragraph(values.get('label')),
      { type: 'code', lang: 'sh', value: values.get('command') },
    ]
  })
}

/**
 * @param {{id: string, title: string, description: string, body: string}} doc
 * @param {Set<string>} ids
 * @param {string | URL} site
 * @param {{name: string, dependencies?: string[], registryDependencies?: string[]} | undefined} item
 * @param {Record<string, () => object[]>} [blocks] Markdown for site components that take no
 *   props and no children, keyed by tag name, such as the preset tabs on the theming page.
 */
export function renderAgentDoc(doc, ids, site, item, blocks = {}) {
  const tree = parser.parse(doc.body)
  function convert(node) {
    if (node.type === 'mdxjsEsm') return []
    if (node.type === 'mdxJsxFlowElement' && node.name === 'CommandTabs') return commandTabs(node)
    if (node.type === 'mdxJsxFlowElement' && node.name === 'Steps' && !node.attributes.length) {
      return node.children.flatMap(convert)
    }
    if (
      node.type === 'mdxJsxFlowElement' &&
      Object.hasOwn(blocks, node.name) &&
      !node.attributes.length &&
      !node.children.length
    ) {
      return blocks[node.name]()
    }
    if (node.type.startsWith('mdx')) {
      throw new Error(`${doc.id}: unsupported ${node.name ?? node.type} in Markdown export`)
    }
    if (node.type === 'link' || node.type === 'definition') {
      const [only] = node.children ?? []
      const autolink =
        node.children?.length === 1 && only.type === 'text' && only.value === node.url
      node.url = resolveLink(node.url, doc.id, ids, site)
      if (autolink) only.value = node.url
    } else if (node.type === 'image') {
      node.url = resolveLink(node.url, doc.id, ids, site, false)
    }
    if (node.children) node.children = node.children.flatMap(convert)
    return [node]
  }
  tree.children = tree.children.flatMap(convert)
  const intro = [
    heading(1, doc.title),
    paragraph(doc.description),
    { type: 'paragraph', children: [link('Documentation', new URL(`${doc.id}/`, site).href)] },
  ]
  if (item) {
    intro.push(
      {
        type: 'paragraph',
        children: [link('Registry source', new URL(`r/${item.name}.json`, site).href)],
      },
      paragraph(`npm dependencies: ${item.dependencies?.join(', ') || 'none declared directly'}.`),
      paragraph(`Registry dependencies: ${item.registryDependencies?.join(', ') || 'none'}.`),
    )
  }
  tree.children.unshift(...intro)
  return writer.stringify(tree)
}

const listItem = (...children) => ({
  type: 'listItem',
  spread: false,
  children: [{ type: 'paragraph', children }],
})
const list = (items) => ({ type: 'list', ordered: false, spread: false, children: items })

/**
 * Index every page in sidebar order. Grouping and sorting are shared with the sidebar, so
 * a page outside a known section or category fails the build here as well.
 * @param {import('./docs-nav.mjs').DocEntry[]} entries
 * @param {string | URL} site
 */
export function renderAgentIndex(entries, site) {
  const children = [
    heading(1, 'eoria'),
    {
      type: 'blockquote',
      children: [
        paragraph(
          'React Native components you copy into your app and own. Built on Unistyles 3 and Reanimated.',
        ),
      ],
    },
    paragraph(
      'Read the installation guide before adding components to a new app. Use the configured paths in eoria.json and inspect existing local copies before relying on upstream documentation. These pages describe the registry shipped with this docs build; local copies can differ.',
    ),
  ]
  for (const group of groupDocs(entries)) {
    if (group.items.length === 0) continue
    children.push(
      heading(2, group.label),
      list(
        group.items.map((entry) =>
          listItem(
            link(entry.data.title, new URL(`${entry.id}.md`, site).href),
            text(`: ${entry.data.description}`),
          ),
        ),
      ),
    )
  }
  children.push(
    heading(2, 'Resources'),
    list([
      listItem(link('Eoria consumer skill', new URL('skills/eoria/SKILL.md', site).href)),
      listItem(link('Registry index', new URL('r/index.json', site).href)),
    ]),
  )
  return writer.stringify({ type: 'root', children })
}
