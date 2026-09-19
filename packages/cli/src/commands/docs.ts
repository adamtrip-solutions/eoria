import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadContext, type ReadOptions } from '../context'
import { CliError } from '../log'

export interface DocsOptions extends ReadOptions {
  docsUrl?: string
}

export interface FetchedDocs {
  /** Null for the `/llms.txt` index. */
  topic: string | null
  /** The URL, or the file path under a local `--docs-url`, that answered. */
  url: string
  markdown: string
}

type Fetch = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'headers' | 'text'>>

const isRemote = (location: string) => /^https?:\/\//.test(location)

/**
 * The docs site that belongs to a registry. The site serves its registry under `/r`, so the
 * base is the registry URL without that segment. A local registry folder has no site, and
 * neither has a URL that does not end in `/r`, so both need `--docs-url`.
 */
export function docsBaseUrl(registry: string, override?: string): string {
  if (override) return override.replace(/\/+$/, '')
  if (!isRemote(registry)) {
    throw new CliError(
      `The registry is a local folder (${registry}), so there is no docs site to derive from it. Pass --docs-url, e.g. --docs-url https://eoria.adamtrip.pt.`,
    )
  }
  const trimmed = registry.replace(/\/+$/, '')
  if (!trimmed.endsWith('/r')) {
    throw new CliError(
      `Cannot tell where the docs for ${registry} live, because the URL does not end in /r. Pass --docs-url.`,
    )
  }
  return trimmed.slice(0, -2)
}

/** The docs folders a bare topic is looked up in, in order. Components come first. */
const SECTIONS = ['components', 'start', 'blocks', 'guides', 'agents']

/**
 * Paths to try for a topic, in order. A bare name is a component first, then a Start page, a
 * block, a guide and an agents page. `start/theming` and `components/select` name the page
 * outright. No topic means `/llms.txt`.
 */
export function docsPaths(topic?: string): string[] {
  if (!topic) return ['/llms.txt']
  const slug = topic
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.mdx?$/, '')
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/.test(slug)) {
    throw new CliError(
      `"${topic}" is not a docs topic. Try a component, a block or a page such as "theming".`,
    )
  }
  if (slug.includes('/')) return [`/${slug}.md`]
  return SECTIONS.map((section) => `/${section}/${slug}.md`)
}

/** Fetches the Markdown twin of a docs page. `fetch` can be swapped out in tests. */
export async function fetchDocs(
  root: string,
  topic: string | undefined,
  options: DocsOptions & { fetch?: Fetch } = {},
): Promise<FetchedDocs> {
  const { registry } = await loadContext(root, options)
  const base = docsBaseUrl(registry.base, options.docsUrl)
  const request = options.fetch ?? ((url: string) => fetch(url))
  const tried: string[] = []

  for (const path of docsPaths(topic)) {
    const url = `${base}${path}`
    if (!isRemote(base)) {
      const file = resolve(base, `.${path}`)
      try {
        return { topic: topic ?? null, url: file, markdown: await readFile(file, 'utf8') }
      } catch {
        tried.push(`${file} does not exist`)
        continue
      }
    }
    let res: Awaited<ReturnType<Fetch>>
    try {
      res = await request(url)
    } catch (error) {
      throw new CliError(`could not reach ${url}: ${(error as Error).message}`)
    }
    // Some static hosts answer a missing page with their HTML shell and a 200.
    const html = res.headers.get('content-type')?.includes('text/html') ?? false
    if (res.ok && !html) return { topic: topic ?? null, url, markdown: await res.text() }
    tried.push(`${url} responded ${html && res.ok ? 'with an HTML page' : res.status}`)
  }
  const hint = topic ? ' `eoria docs` with no topic prints the index of pages.' : ''
  throw new CliError(`No docs page for ${topic ?? 'llms.txt'}. ${tried.join(', ')}.${hint}`)
}

export async function docs(
  root: string,
  topic: string | undefined,
  options: DocsOptions,
): Promise<void> {
  const page = await fetchDocs(root, topic, options)
  process.stdout.write(page.markdown.endsWith('\n') ? page.markdown : `${page.markdown}\n`)
}
