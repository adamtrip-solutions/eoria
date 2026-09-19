import { existsSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { findProjectRoot } from '../config'
import { CliError, log } from '../log'
import { createMcpServer } from '../mcp/server'
import { columns, reserveStdout } from '../print'

export interface McpOptions {
  cwd?: string
  registry?: string
  docsUrl?: string
}

/** Serves the MCP tools on stdin and stdout until stdin ends. */
export async function mcp(options: McpOptions): Promise<void> {
  // Stdout belongs to the protocol. Progress lines, child processes and any stray
  // `console.log` go to stderr, which MCP clients treat as a log.
  reserveStdout()
  console.log = console.info = console.debug = (...args: unknown[]) => console.error(...args)

  const cwd = resolve(options.cwd ?? process.cwd())
  if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
    throw new CliError(`--cwd ${options.cwd} is not a folder.`)
  }
  const server = createMcpServer({
    root: findProjectRoot(cwd),
    registry: options.registry,
    docsUrl: options.docsUrl,
    input: process.stdin,
    output: process.stdout,
  })
  await server.closed
}

const SERVER_NAME = 'eoria'
const COMMAND = 'npx'
const ARGS = ['-y', '@eoria/cli@latest', 'mcp']

interface JsonClient {
  /** Path of the config file, relative to the project root. */
  file: string
  /** The key that holds the servers. */
  key: 'mcpServers' | 'servers'
  entry: Record<string, unknown>
}

const JSON_CLIENTS: Record<'claude' | 'cursor' | 'vscode', JsonClient> = {
  claude: { file: '.mcp.json', key: 'mcpServers', entry: { command: COMMAND, args: ARGS } },
  cursor: { file: '.cursor/mcp.json', key: 'mcpServers', entry: { command: COMMAND, args: ARGS } },
  vscode: {
    file: '.vscode/mcp.json',
    key: 'servers',
    entry: { type: 'stdio', command: COMMAND, args: ARGS },
  },
}

export const CODEX_CONFIG = '~/.codex/config.toml'

const CODEX_SNIPPET = `[mcp_servers.${SERVER_NAME}]
command = ${JSON.stringify(COMMAND)}
args = [${ARGS.map((arg) => JSON.stringify(arg)).join(', ')}]
`

export type McpClient = keyof typeof JSON_CLIENTS | 'codex'

export const MCP_CLIENTS: Array<{ name: McpClient; does: string }> = [
  { name: 'claude', does: `writes ${JSON_CLIENTS.claude.file} for Claude Code` },
  { name: 'cursor', does: `writes ${JSON_CLIENTS.cursor.file}` },
  { name: 'vscode', does: `writes ${JSON_CLIENTS.vscode.file}` },
  { name: 'codex', does: `prints the lines for ${CODEX_CONFIG}` },
]

export interface McpInitOptions {
  client?: string
  force?: boolean
}

export interface McpInitResult {
  client: McpClient
  /** Path relative to the project root. For codex, the file the user edits by hand. */
  file: string
  /**
   * `created` wrote a new file. `added` put the entry into an existing file. `replaced` swapped
   * a different `eoria` entry under `--force`. `unchanged` found the same entry already there.
   * `printed` wrote nothing, which is all codex gets.
   */
  action: 'created' | 'added' | 'replaced' | 'unchanged' | 'printed'
  /** The entry as it belongs in the file, JSON or TOML. */
  snippet: string
}

/** Adds the eoria server to a client's project config and keeps everything else in the file. */
export async function initMcpClient(
  root: string,
  client: string,
  options: Pick<McpInitOptions, 'force'> = {},
): Promise<McpInitResult> {
  if (client === 'codex') {
    return { client, file: CODEX_CONFIG, action: 'printed', snippet: CODEX_SNIPPET }
  }
  if (!Object.hasOwn(JSON_CLIENTS, client)) {
    const names = MCP_CLIENTS.map((known) => known.name).join(', ')
    throw new CliError(`"${client}" is not a client eoria knows. Pick one of ${names}.`)
  }
  const name = client as keyof typeof JSON_CLIENTS
  const { file, key, entry } = JSON_CLIENTS[name]
  const snippet = JSON.stringify({ [key]: { [SERVER_NAME]: entry } }, null, 2)
  const path = resolve(root, file)
  const byHand = `Nothing was written. Add this to it by hand:\n${snippet}`

  if (!existsSync(path)) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, `${snippet}\n`)
    return { client: name, file, action: 'created', snippet }
  }

  let config: unknown
  try {
    config = JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    throw new CliError(`${file} is not valid JSON: ${(error as Error).message}. ${byHand}`)
  }
  if (!isRecord(config)) throw new CliError(`${file} does not hold a JSON object. ${byHand}`)
  const servers = config[key] ?? {}
  if (!isRecord(servers)) throw new CliError(`"${key}" in ${file} is not an object. ${byHand}`)

  const existing = servers[SERVER_NAME]
  if (isDeepStrictEqual(existing, entry)) {
    return { client: name, file, action: 'unchanged', snippet }
  }
  if (existing !== undefined && !options.force) {
    throw new CliError(
      `${file} already has an "${SERVER_NAME}" server with other settings. Pass --force to replace it.`,
    )
  }
  config[key] = { ...servers, [SERVER_NAME]: entry }
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`)
  return { client: name, file, action: existing === undefined ? 'added' : 'replaced', snippet }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export async function mcpInit(root: string, options: McpInitOptions): Promise<void> {
  if (!options.client) {
    log.info('Pass --client with one of these:')
    for (const line of columns(MCP_CLIENTS.map((client) => [client.name, client.does]))) {
      log.info(`  ${line}`)
    }
    return
  }
  const result = await initMcpClient(root, options.client, options)
  if (result.action === 'printed') {
    log.step(`Codex reads its servers from ${result.file}, which eoria leaves alone. Add this:`)
    log.info('')
    log.info(result.snippet)
    return
  }
  if (result.action === 'unchanged') {
    log.step(`${result.file} already has the eoria server.`)
    return
  }
  const did = {
    created: 'Wrote',
    added: 'Added the eoria server to',
    replaced: 'Replaced the eoria server in',
  }
  log.ok(`${did[result.action]} ${result.file}.`)
  log.info(log.dim(`It runs \`${[COMMAND, ...ARGS].join(' ')}\`. Restart the client to load it.`))
}
