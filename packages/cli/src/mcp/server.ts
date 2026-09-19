import { CLI_VERSION } from '../version'
import {
  callTool,
  checkArguments,
  toolDefinitions,
  toolSchema,
  type ToolContext,
  type ToolResult,
} from './tools'

/** Newest first. `initialize` answers with the client's version when it is in this list. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

const INSTRUCTIONS = [
  'Use these tools when the task touches eoria components in a React Native or Expo app.',
  'search_components and view_component find a component, get_docs explains how to use it, and add_components copies it into the app.',
  'get_project_info and run_doctor report how the app is set up.',
  'eoria copies component source into the app and the developer may have edited it, so the files in the app are authoritative.',
  'Read the installed file before you write code against a component, and trust it over the docs and the registry when they differ.',
].join(' ')

const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602
const INTERNAL_ERROR = -32603

type Id = string | number | null

interface Reply {
  jsonrpc: '2.0'
  id: Id
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

/** A failure that becomes a JSON-RPC error reply instead of a tool result. */
class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message)
  }
}

export interface McpServerOptions extends ToolContext {
  input: NodeJS.ReadableStream
  output: NodeJS.WritableStream
}

export interface McpServer {
  /** Resolves once the input has ended and every reply is written. */
  closed: Promise<void>
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isId = (value: unknown): value is string | number =>
  typeof value === 'string' || typeof value === 'number'

/**
 * A Model Context Protocol server over a pair of streams. Each line of `input` is one JSON-RPC
 * message, and each reply is one line on `output`. Requests run side by side. A reply goes out
 * in a single `write`, so two replies never mix.
 */
export function createMcpServer(options: McpServerOptions): McpServer {
  const { input, output, ...context } = options
  const running = new Set<Promise<void>>()
  let open = true

  const send = (message: Reply | Reply[]) => {
    // JSON.stringify escapes every newline inside a string, so the message stays on one line.
    if (open) output.write(`${JSON.stringify(message)}\n`)
  }

  const receive = (line: string) => {
    if (line.trim() === '') return
    let message: unknown
    try {
      message = JSON.parse(line)
    } catch {
      send(failure(null, PARSE_ERROR, 'Parse error: the line is not valid JSON.'))
      return
    }
    const task: Promise<void> = dispatch(message, context)
      .then((reply) => {
        if (reply) send(reply)
      })
      // A write to a closed stream. The `error` listener below ends the server.
      .catch(() => {})
      .finally(() => running.delete(task))
    running.add(task)
  }

  const closed = new Promise<void>((done) => {
    // Split on the newline byte, so a character cut in half by a chunk boundary survives.
    let pending = Buffer.alloc(0)
    const finish = async () => {
      if (pending.length > 0) receive(pending.toString('utf8'))
      pending = Buffer.alloc(0)
      while (running.size > 0) await Promise.all(running)
      open = false
      done()
    }
    input.on('data', (chunk: Buffer | string) => {
      pending = Buffer.concat([pending, typeof chunk === 'string' ? Buffer.from(chunk) : chunk])
      for (let end = pending.indexOf(10); end !== -1; end = pending.indexOf(10)) {
        const line = pending.subarray(0, end).toString('utf8')
        pending = pending.subarray(end + 1)
        receive(line)
      }
    })
    input.on('end', () => void finish())
    input.on('error', () => void finish())
    // The client went away. There is nobody left to answer.
    output.on('error', () => {
      open = false
      done()
    })
  })

  return { closed }
}

/** Protocol revision 2025-03-26 lets a client send several messages as one JSON array. */
async function dispatch(message: unknown, context: ToolContext): Promise<Reply | Reply[] | null> {
  if (!Array.isArray(message)) return handle(message, context)
  if (message.length === 0) return failure(null, INVALID_REQUEST, 'Invalid request: empty batch.')
  const replies = await Promise.all(message.map((entry) => handle(entry, context)))
  const present = replies.filter((reply): reply is Reply => reply !== null)
  return present.length > 0 ? present : null
}

async function handle(message: unknown, context: ToolContext): Promise<Reply | null> {
  if (!isObject(message) || message.jsonrpc !== '2.0') {
    const id = isObject(message) && isId(message.id) ? message.id : null
    return failure(id, INVALID_REQUEST, 'Invalid request: expected a JSON-RPC 2.0 message.')
  }
  const hasId = 'id' in message
  if (typeof message.method !== 'string') {
    // A reply to a request. This server sends none, so there is nothing to match it with.
    if ('result' in message || 'error' in message) return null
    return failure(
      isId(message.id) ? message.id : null,
      INVALID_REQUEST,
      'Invalid request: no method.',
    )
  }
  // Notifications get no reply, whatever they say.
  if (!hasId) return null
  if (!isId(message.id)) {
    return failure(null, INVALID_REQUEST, 'Invalid request: id must be a string or a number.')
  }

  try {
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: await answer(message.method, message.params, context),
    }
  } catch (error) {
    if (error instanceof RpcError) return failure(message.id, error.code, error.message, error.data)
    return failure(message.id, INTERNAL_ERROR, `Internal error: ${(error as Error).message}`)
  }
}

async function answer(method: string, params: unknown, context: ToolContext): Promise<unknown> {
  if (params !== undefined && !isObject(params)) {
    throw new RpcError(INVALID_PARAMS, 'Invalid params: expected an object.')
  }
  switch (method) {
    case 'initialize':
      return initialize(params)
    case 'ping':
      return {}
    case 'tools/list':
      return { tools: toolDefinitions() }
    case 'tools/call':
      return call(params, context)
    default:
      throw new RpcError(METHOD_NOT_FOUND, `Method not found: ${method}`)
  }
}

function initialize(params: Record<string, unknown> | undefined) {
  const requested = params?.protocolVersion
  if (typeof requested !== 'string') {
    throw new RpcError(INVALID_PARAMS, 'Invalid params: protocolVersion must be a string.', {
      supported: PROTOCOL_VERSIONS,
    })
  }
  return {
    protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
    capabilities: { tools: {} },
    serverInfo: { name: 'eoria', version: CLI_VERSION },
    instructions: INSTRUCTIONS,
  }
}

async function call(
  params: Record<string, unknown> | undefined,
  context: ToolContext,
): Promise<ToolResult> {
  const name = params?.name
  if (typeof name !== 'string') {
    throw new RpcError(INVALID_PARAMS, 'Invalid params: name must be a string.')
  }
  const schema = toolSchema(name)
  if (!schema) throw new RpcError(INVALID_PARAMS, `Unknown tool: ${name}`)
  const args = params?.arguments ?? {}
  if (!isObject(args)) {
    throw new RpcError(INVALID_PARAMS, 'Invalid params: arguments must be an object.')
  }
  // Wrong arguments come back as a tool error, which the model reads and can correct.
  const problem = checkArguments(schema, args)
  if (problem) return toolError(`Invalid arguments for ${name}: ${problem}`)
  try {
    return await callTool(name, args, context)
  } catch (error) {
    return toolError((error as Error).message || String(error))
  }
}

function toolError(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true }
}

function failure(id: Id, code: number, message: string, data?: unknown): Reply {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } }
}
