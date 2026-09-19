import { mkdtemp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { PassThrough } from 'node:stream'
import { initMcpClient, mcpInit } from '../commands/mcp'
import { defaultConfig, readConfig, writeConfig } from '../config'
import { PROTOCOL_VERSIONS, createMcpServer } from '../mcp/server'
import type { ToolContext } from '../mcp/tools'

const registryDir = resolve(__dirname, '../../../../registry/dist')
const hasRegistry = existsSync(join(registryDir, 'index.json'))
const maybe = hasRegistry ? test : test.skip

type Id = string | number | null

interface Reply {
  jsonrpc: '2.0'
  id: Id
  result?: any
  error?: { code: number; message: string; data?: unknown }
}

/** A client on the other end of the server's streams. */
function connect(context: ToolContext) {
  const input = new PassThrough()
  const output = new PassThrough()
  const server = createMcpServer({ ...context, input, output })
  // A batch comes back as an array, which has no id, so its key is undefined.
  const waiting = new Map<Id | undefined, (reply: Reply) => void>()
  let raw = ''
  let rest = ''
  let nextId = 1

  output.on('data', (chunk: Buffer) => {
    raw += chunk.toString('utf8')
    const lines = (rest + chunk.toString('utf8')).split('\n')
    rest = lines.pop() ?? ''
    for (const line of lines) {
      const reply = JSON.parse(line) as Reply
      waiting.get(reply.id)?.(reply)
      waiting.delete(reply.id)
    }
  })

  const replyTo = (id: Id | undefined) => new Promise<Reply>((done) => waiting.set(id, done))

  return {
    /** Writes a line as it is and resolves with the reply that carries `id`. */
    raw(line: string, id: Id | undefined): Promise<Reply> {
      const reply = replyTo(id)
      input.write(`${line}\n`)
      return reply
    },
    request(method: string, params?: unknown): Promise<Reply> {
      const id = nextId++
      const reply = replyTo(id)
      input.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
      return reply
    },
    notify(method: string, params?: unknown): void {
      input.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`)
    },
    async call(name: string, args?: Record<string, unknown>) {
      const reply = await this.request('tools/call', { name, arguments: args })
      const text = reply.result?.content?.[0]?.text as string
      return { reply, text, isError: reply.result?.isError === true }
    },
    /** Ends the input, waits for the server and returns every line it wrote. */
    async close(): Promise<string[]> {
      input.end()
      await server.closed
      expect(raw.endsWith('\n') || raw === '').toBe(true)
      return raw.split('\n').filter(Boolean)
    },
    input,
    replyTo,
  }
}

async function project(pkg: Record<string, unknown> = { name: 'app', dependencies: {} }) {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  await writeFile(join(root, 'package.json'), JSON.stringify(pkg))
  await mkdir(join(root, 'src'), { recursive: true })
  await writeConfig(root, {
    ...defaultConfig,
    registry: registryDir,
    alias: '~/ui',
    components: 'src/ui',
  })
  return root
}

/** Every file under a folder with its content, to prove a call wrote nothing. */
async function snapshot(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = join(root, entry.name)
    if (entry.isDirectory()) Object.assign(out, await snapshot(file))
    else out[file] = await readFile(file, 'utf8')
  }
  return out
}

/** Runs a command and returns what it printed, without colour codes. */
async function capture(task: () => Promise<void>): Promise<string> {
  const lines: string[] = []
  const spy = jest.spyOn(console, 'log').mockImplementation((msg = '') => {
    lines.push(String(msg))
  })
  try {
    await task()
  } finally {
    spy.mockRestore()
  }
  return lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '')
}

test('initialize answers with the requested version, or the latest when it is unknown', async () => {
  const client = connect({ root: await mkdtemp(join(tmpdir(), 'eoria-')) })
  const params = { capabilities: {}, clientInfo: { name: 'test', version: '1' } }

  const old = await client.request('initialize', { ...params, protocolVersion: '2024-11-05' })
  expect(old.result).toEqual({
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: { name: 'eoria', version: '0.0.0-dev' },
    instructions: expect.stringContaining('authoritative'),
  })
  for (const version of ['2025-06-18', '2025-03-26']) {
    const reply = await client.request('initialize', { ...params, protocolVersion: version })
    expect(reply.result.protocolVersion).toBe(version)
  }
  const future = await client.request('initialize', { ...params, protocolVersion: '2099-01-01' })
  expect(future.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0])
  expect(PROTOCOL_VERSIONS[0]! > '2025-06-18').toBe(true)

  const bad = await client.request('initialize', { protocolVersion: 7 })
  expect(bad.error?.code).toBe(-32602)

  client.notify('notifications/initialized')
  client.notify('notifications/cancelled', { requestId: 99 })
  client.notify('no/such/notification')
  expect((await client.request('ping')).result).toEqual({})

  // Six requests, six replies. The three notifications got none.
  expect(await client.close()).toHaveLength(6)
})

test('tools/list names seven tools, each with a closed object schema', async () => {
  const client = connect({ root: await mkdtemp(join(tmpdir(), 'eoria-')) })
  const { result } = await client.request('tools/list')
  expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual([
    'list_components',
    'search_components',
    'view_component',
    'get_docs',
    'get_project_info',
    'run_doctor',
    'add_components',
  ])
  for (const tool of result.tools) {
    expect(tool.inputSchema.type).toBe('object')
    expect(tool.inputSchema.additionalProperties).toBe(false)
    expect(typeof tool.inputSchema.properties).toBe('object')
    for (const name of tool.inputSchema.required ?? []) {
      expect(tool.inputSchema.properties).toHaveProperty(name)
    }
    expect(tool.description.length).toBeGreaterThan(40)
    expect(tool).not.toHaveProperty('run')
    expect(tool.annotations.readOnlyHint).toBe(tool.name !== 'add_components')
  }
  const add = result.tools.find((tool: { name: string }) => tool.name === 'add_components')
  expect(add.inputSchema.properties.names).toMatchObject({ minItems: 1, maxItems: 20 })
  expect(add.inputSchema.properties).not.toHaveProperty('fix')
  await client.close()
})

test('malformed JSON, unknown methods and bad params get JSON-RPC errors', async () => {
  const client = connect({ root: await mkdtemp(join(tmpdir(), 'eoria-')) })

  const parse = await client.raw('{ nope', null)
  expect(parse).toEqual({
    jsonrpc: '2.0',
    id: null,
    error: { code: -32700, message: expect.stringContaining('Parse error') },
  })
  expect((await client.request('resources/list')).error).toEqual({
    code: -32601,
    message: 'Method not found: resources/list',
  })
  expect((await client.raw('{"id":"a","method":"ping"}', 'a')).error?.code).toBe(-32600)
  expect((await client.raw('[]', null)).error?.code).toBe(-32600)
  expect((await client.raw('7', null)).error?.code).toBe(-32600)

  expect((await client.request('tools/call', {})).error?.code).toBe(-32602)
  expect((await client.request('tools/call', { name: 'nope' })).error).toEqual({
    code: -32602,
    message: 'Unknown tool: nope',
  })
  const args = await client.request('tools/call', { name: 'list_components', arguments: [] })
  expect(args.error?.code).toBe(-32602)
  expect((await client.request('tools/list', 'x')).error?.code).toBe(-32602)

  // A reply to a request the server never made is dropped, and the server keeps answering.
  client.input.write('{"jsonrpc":"2.0","id":1,"result":{}}\n')
  expect((await client.raw('{"jsonrpc":"2.0","id":"p","method":"ping"}', 'p')).result).toEqual({})
  await client.close()
})

maybe('requests run side by side, in a batch and across chunk boundaries', async () => {
  const client = connect({ root: await project() })
  const replies = Promise.all([
    client.request('tools/call', { name: 'list_components' }),
    client.request('ping'),
    client.request('tools/call', { name: 'search_components', arguments: { query: 'text' } }),
  ])
  const [list, ping, search] = await replies
  expect(list.result.isError).toBeUndefined()
  expect(ping.result).toEqual({})
  expect(JSON.parse(search.result.content[0].text).items[0].name).toBe('text')

  // One message in two chunks, cut inside a three-byte character.
  const bytes = Buffer.from(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id: 'split',
      method: 'tools/call',
      params: { name: 'search_components', arguments: { query: '€€€' } },
    })}\n`,
  )
  const cut = bytes.indexOf(0xe2) + 1
  const split = client.replyTo('split')
  client.input.write(bytes.subarray(0, cut))
  client.input.write(bytes.subarray(cut))
  expect(JSON.parse((await split).result.content[0].text)).toMatchObject({
    query: '€€€',
    items: [],
  })

  const batch = await client.raw(
    JSON.stringify([
      { jsonrpc: '2.0', id: 'b1', method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 'b2', method: 'nope' },
    ]),
    undefined,
  )
  expect(batch).toEqual([
    { jsonrpc: '2.0', id: 'b1', result: {} },
    { jsonrpc: '2.0', id: 'b2', error: { code: -32601, message: 'Method not found: nope' } },
  ])
  await client.close()
})

maybe('the read tools answer from the registry, inside a project and outside one', async () => {
  const root = await project()
  const site = join(root, 'site')
  await mkdir(join(site, 'components'), { recursive: true })
  await writeFile(join(site, 'llms.txt'), '# eoria\n')
  await writeFile(join(site, 'components/button.md'), '# Button\n\nPress it.\n')
  const client = connect({ root, docsUrl: site })

  const list = await client.call('list_components')
  expect(list.isError).toBe(false)
  expect(list.reply.result.content).toHaveLength(1)
  // Pretty-printed, as `--json` prints it.
  expect(list.text).toContain('\n  "registry"')
  const listed = JSON.parse(list.text)
  expect(Object.keys(listed)).toEqual(['registry', 'items'])
  expect(listed.items.find((item: { name: string }) => item.name === 'button').installed).toBe(
    false,
  )

  const search = JSON.parse((await client.call('search_components', { query: 'TEXT' })).text)
  expect(search.items.map((item: { name: string }) => item.name).slice(0, 2)).toEqual([
    'text',
    'textarea',
  ])

  const view = JSON.parse((await client.call('view_component', { name: 'select' })).text)
  expect(view.allRegistryDependencies).toEqual(expect.arrayContaining(['popper', 'portal']))
  expect(view.files[0].localPath).toBe('src/ui/select.tsx')
  expect(view.files[0]).not.toHaveProperty('content')
  const source = JSON.parse(
    (await client.call('view_component', { name: 'button', source: true })).text,
  )
  expect(source.files[0].content).toContain("from '~/ui/text'")

  expect((await client.call('get_docs', { topic: 'button' })).text).toBe('# Button\n\nPress it.\n')
  expect((await client.call('get_docs')).text).toBe('# eoria\n')

  const info = JSON.parse((await client.call('get_project_info')).text)
  expect(info.root).toBe(root)
  expect(info.config.values).toEqual({ registry: registryDir, components: 'src/ui', alias: '~/ui' })
  expect(info.packageManager).toBe('npm')

  const before = await snapshot(root)
  const doctor = await client.call('run_doctor')
  expect(doctor.isError).toBe(false)
  const report = JSON.parse(doctor.text)
  expect(report.ok).toBe(false)
  expect(report.fixed).toEqual([])
  expect(report.checks.find((check: { id: string }) => check.id === 'config').status).toBe('pass')
  expect(await snapshot(root)).toEqual(before)
  await client.close()

  // No eoria.json. The registry comes from the option, as `--registry` sets it.
  const bare = await mkdtemp(join(tmpdir(), 'eoria-'))
  const outside = connect({ root: bare, registry: registryDir })
  const items = JSON.parse((await outside.call('list_components')).text).items
  expect(items.length).toBe(listed.items.length)
  expect(items.every((item: { installed: null }) => item.installed === null)).toBe(true)
  const viewed = JSON.parse((await outside.call('view_component', { name: 'button' })).text)
  expect(viewed.files[0].localPath).toBeNull()
  expect(JSON.parse((await outside.call('get_project_info')).text).config.values).toBeNull()

  const add = await outside.call('add_components', { names: ['button'] })
  expect(add.isError).toBe(true)
  expect(add.text).toContain(`No eoria.json in ${bare}`)
  expect(add.text).toContain('npx @eoria/cli init')
  expect(await readdir(bare)).toEqual([])
  await outside.close()
})

maybe(
  'add_components plans with dryRun, then writes files and leaves the install to the agent',
  async () => {
    const root = await project()
    const client = connect({ root })
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const logged = jest.spyOn(console, 'log').mockImplementation(() => {})
    let lines: string[]
    try {
      const before = await snapshot(root)
      const dry = await client.call('add_components', { names: ['button'], dryRun: true })
      expect(dry.isError).toBe(false)
      const plan = JSON.parse(dry.text)
      expect(await snapshot(root)).toEqual(before)
      expect(plan.items).toEqual(['text', 'button'])
      expect(plan.pulled).toEqual(['text'])
      expect(plan.files).toEqual([
        { item: 'text', target: 'src/ui/text.tsx', action: 'write', edited: false },
        { item: 'button', target: 'src/ui/button.tsx', action: 'write', edited: false },
      ])
      expect(plan.installCommand.slice(0, 2)).toEqual(['npm', 'install'])

      const added = JSON.parse((await client.call('add_components', { names: ['button'] })).text)
      expect(added).toEqual({
        written: ['src/ui/text.tsx', 'src/ui/button.tsx'],
        skipped: [],
        unchanged: [],
        installCommand: plan.installCommand,
      })
      expect(added.installCommand).toContain('@eoria/core')
      const button = await readFile(join(root, 'src/ui/button.tsx'), 'utf8')
      expect(button).toContain("from '~/ui/text'")
      expect(Object.keys((await readConfig(root))!.installed)).toEqual(['text', 'button'])
      // The install did not run.
      expect(existsSync(join(root, 'node_modules'))).toBe(false)
      expect(await readFile(join(root, 'package.json'), 'utf8')).toBe(
        JSON.stringify({ name: 'app', dependencies: {} }),
      )

      await writeFile(join(root, 'src/ui/button.tsx'), `${button}\n// edited`)
      const again = JSON.parse((await client.call('add_components', { names: ['button'] })).text)
      expect(again).toMatchObject({
        written: [],
        skipped: [{ target: 'src/ui/button.tsx', edited: true }],
        unchanged: ['src/ui/text.tsx'],
      })
      expect(await readFile(join(root, 'src/ui/button.tsx'), 'utf8')).toContain('// edited')
      const forced = JSON.parse(
        (await client.call('add_components', { names: ['button'], overwrite: true })).text,
      )
      expect(forced.written).toEqual(['src/ui/text.tsx', 'src/ui/button.tsx'])
      expect(await readFile(join(root, 'src/ui/button.tsx'), 'utf8')).toBe(button)

      // Two adds at once both end up in eoria.json.
      await Promise.all([
        client.call('add_components', { names: ['badge'] }),
        client.call('add_components', { names: ['card'] }),
      ])
      expect(Object.keys((await readConfig(root))!.installed)).toEqual(
        expect.arrayContaining(['badge', 'card', 'button']),
      )

      lines = await client.close()
      // The server writes to the stream it was given and to nothing else.
      expect(stdout).not.toHaveBeenCalled()
      expect(logged).not.toHaveBeenCalled()
    } finally {
      stdout.mockRestore()
      logged.mockRestore()
    }
    expect(lines).toHaveLength(6)
    for (const line of lines) expect(JSON.parse(line)).toMatchObject({ jsonrpc: '2.0' })
  },
)

maybe('a failing tool comes back as isError and the server keeps answering', async () => {
  const client = connect({ root: await project() })

  const missing = await client.call('view_component', { name: 'no-such-item' })
  expect(missing.reply.error).toBeUndefined()
  expect(missing.reply.result).toEqual({
    content: [{ type: 'text', text: expect.stringContaining('no-such-item.json not found') }],
    isError: true,
  })
  // The registry is a local folder, which has no docs site.
  expect((await client.call('get_docs', { topic: 'button' })).text).toMatch(/local folder/)
  expect((await client.call('add_components', { names: ['../evil'] })).text).toContain('plain name')

  const wrong: Array<[string, Record<string, unknown>, string]> = [
    ['search_components', {}, '"query" is required.'],
    ['search_components', { query: 7 }, '"query" must be a string.'],
    ['search_components', { query: '' }, '"query" must not be empty.'],
    ['view_component', { name: 'button', source: 'yes' }, '"source" must be true or false.'],
    ['list_components', { verbose: true }, '"verbose" is not an argument. It takes type.'],
    ['list_components', { type: 'screen' }, '"type" must be one of ui, block.'],
    ['search_components', { query: 'sign', type: 7 }, '"type" must be a string.'],
    ['run_doctor', { fix: true }, '"fix" is not an argument. It takes none.'],
    ['add_components', { names: [] }, '"names" takes 1 to 20 items, got 0.'],
    ['add_components', { names: Array(21).fill('button') }, 'got 21.'],
    ['add_components', { names: 'button' }, '"names" must be an array of strings.'],
  ]
  for (const [name, args, message] of wrong) {
    const result = await client.call(name, args)
    expect(result.isError).toBe(true)
    expect(result.text).toContain(`Invalid arguments for ${name}`)
    expect(result.text).toContain(message)
  }

  expect((await client.call('list_components')).isError).toBe(false)
  for (const line of await client.close()) expect(() => JSON.parse(line)).not.toThrow()
})

test('reserveStdout moves the progress lines to stderr', () => {
  jest.isolateModules(() => {
    const { log } = require('../log') as typeof import('../log')
    const { reserveStdout } = require('../print') as typeof import('../print')
    const out = jest.spyOn(console, 'log').mockImplementation(() => {})
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      reserveStdout()
      log.info('a')
      log.step('b')
      log.ok('c')
      log.warn('d')
      expect(out).not.toHaveBeenCalled()
      expect(err).toHaveBeenCalledTimes(4)
    } finally {
      out.mockRestore()
      err.mockRestore()
    }
  })
})

const ARGS = ['-y', '@eoria/cli@latest', 'mcp']

test('mcp init writes the config of each client', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  const read = async (file: string) => JSON.parse(await readFile(join(root, file), 'utf8'))

  expect(await initMcpClient(root, 'claude')).toMatchObject({
    client: 'claude',
    file: '.mcp.json',
    action: 'created',
  })
  expect(await read('.mcp.json')).toEqual({
    mcpServers: { eoria: { command: 'npx', args: ARGS } },
  })
  expect((await readFile(join(root, '.mcp.json'), 'utf8')).endsWith('}\n')).toBe(true)

  expect((await initMcpClient(root, 'cursor')).file).toBe('.cursor/mcp.json')
  expect(await read('.cursor/mcp.json')).toEqual({
    mcpServers: { eoria: { command: 'npx', args: ARGS } },
  })

  expect((await initMcpClient(root, 'vscode')).file).toBe('.vscode/mcp.json')
  expect(await read('.vscode/mcp.json')).toEqual({
    servers: { eoria: { type: 'stdio', command: 'npx', args: ARGS } },
  })

  const written = await snapshot(root)
  expect((await initMcpClient(root, 'claude')).action).toBe('unchanged')
  const codex = await initMcpClient(root, 'codex')
  expect(codex).toEqual({
    client: 'codex',
    file: '~/.codex/config.toml',
    action: 'printed',
    snippet: '[mcp_servers.eoria]\ncommand = "npx"\nargs = ["-y", "@eoria/cli@latest", "mcp"]\n',
  })
  expect(await snapshot(root)).toEqual(written)
  await expect(initMcpClient(root, 'emacs')).rejects.toThrow(
    '"emacs" is not a client eoria knows. Pick one of claude, cursor, vscode, codex.',
  )
})

test('mcp init merges into a file, stops at a conflict and never replaces broken JSON', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))
  const file = join(root, '.mcp.json')
  const other = { command: 'node', args: ['server.js'], env: { TOKEN: 'x' } }
  await writeFile(file, JSON.stringify({ $schema: 'https://example.com', mcpServers: { other } }))

  expect((await initMcpClient(root, 'claude')).action).toBe('added')
  expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({
    $schema: 'https://example.com',
    mcpServers: { other, eoria: { command: 'npx', args: ARGS } },
  })

  const pinned = { command: 'pnpm', args: ['eoria', 'mcp'] }
  const conflict = JSON.stringify({ mcpServers: { other, eoria: pinned }, inputs: [] })
  await writeFile(file, conflict)
  await expect(initMcpClient(root, 'claude')).rejects.toThrow(
    '.mcp.json already has an "eoria" server with other settings. Pass --force to replace it.',
  )
  expect(await readFile(file, 'utf8')).toBe(conflict)
  expect((await initMcpClient(root, 'claude', { force: true })).action).toBe('replaced')
  expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({
    mcpServers: { other, eoria: { command: 'npx', args: ARGS } },
    inputs: [],
  })

  // A file without the key gets one. VS Code keeps its servers under `servers`.
  await mkdir(join(root, '.vscode'))
  await writeFile(join(root, '.vscode/mcp.json'), JSON.stringify({ inputs: [{ id: 'key' }] }))
  expect((await initMcpClient(root, 'vscode')).action).toBe('added')
  expect(JSON.parse(await readFile(join(root, '.vscode/mcp.json'), 'utf8'))).toEqual({
    inputs: [{ id: 'key' }],
    servers: { eoria: { type: 'stdio', command: 'npx', args: ARGS } },
  })

  for (const broken of ['{ "mcpServers": { // mine\n } }', '[]', '{ "mcpServers": [] }']) {
    await writeFile(file, broken)
    await expect(initMcpClient(root, 'claude', { force: true })).rejects.toThrow(
      /Nothing was written\. Add this to it by hand:\n\{\n {2}"mcpServers"/,
    )
    expect(await readFile(file, 'utf8')).toBe(broken)
  }
  await expect(initMcpClient(root, 'claude')).rejects.toThrow('"mcpServers" in .mcp.json')
  await writeFile(file, '{ nope')
  await expect(initMcpClient(root, 'claude')).rejects.toThrow('.mcp.json is not valid JSON')
})

test('mcp init prints what it did, the codex lines, and the clients when none is named', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eoria-'))

  const none = await capture(() => mcpInit(root, {}))
  for (const name of ['claude', 'cursor', 'vscode', 'codex']) expect(none).toContain(`  ${name}`)
  expect(none).toContain('.cursor/mcp.json')
  expect(await readdir(root)).toEqual([])

  const wrote = await capture(() => mcpInit(root, { client: 'cursor' }))
  expect(wrote).toContain('✓ Wrote .cursor/mcp.json.')
  expect(wrote).toContain('npx -y @eoria/cli@latest mcp')
  expect(await capture(() => mcpInit(root, { client: 'cursor' }))).toContain(
    '.cursor/mcp.json already has the eoria server.',
  )

  const codex = await capture(() => mcpInit(root, { client: 'codex' }))
  expect(codex).toContain('~/.codex/config.toml')
  expect(codex).toContain('[mcp_servers.eoria]\ncommand = "npx"')
  expect(await readdir(root)).toEqual(['.cursor'])
})
