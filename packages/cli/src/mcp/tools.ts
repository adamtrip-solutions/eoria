import { planAdd, writePlan } from '../commands/add'
import { fetchDocs } from '../commands/docs'
import { runDoctor } from '../commands/doctor'
import { projectInfo } from '../commands/info'
import { listItems } from '../commands/list'
import { searchItems } from '../commands/search'
import { viewItem } from '../commands/view'
import { readConfigOrFail, type ReadOptions } from '../context'
import { CliError } from '../log'

/** What every tool works from. The server fixes these when it starts. */
export interface ToolContext {
  /** The folder that holds `eoria.json`, or would. */
  root: string
  /** Replaces the registry from `eoria.json` for every tool. */
  registry?: string | undefined
  /** Where `get_docs` reads pages from, for a registry that has no docs site. */
  docsUrl?: string | undefined
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

interface StringSchema {
  type: 'string'
  description: string
  minLength?: number
}

interface BooleanSchema {
  type: 'boolean'
  description: string
}

interface StringArraySchema {
  type: 'array'
  description: string
  items: { type: 'string'; minLength?: number }
  minItems?: number
  maxItems?: number
}

/** The part of JSON Schema the tools use. `checkArguments` enforces all of it. */
export interface InputSchema {
  type: 'object'
  properties: Record<string, StringSchema | BooleanSchema | StringArraySchema>
  required?: string[]
  additionalProperties: false
}

export interface ToolDefinition {
  name: string
  title: string
  description: string
  inputSchema: InputSchema
  annotations: {
    readOnlyHint: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
  }
}

interface Tool extends ToolDefinition {
  /** Returns the text of the result. Anything but a string is printed as JSON. */
  run: (args: Record<string, unknown>, context: ToolContext) => Promise<unknown>
}

/** The registry override, left out when there is none. */
const reading = ({ registry }: ToolContext): ReadOptions => (registry ? { registry } : {})

const noArguments: InputSchema = { type: 'object', properties: {}, additionalProperties: false }
const readOnly = { readOnlyHint: true }

const TOOLS: Tool[] = [
  {
    name: 'list_components',
    title: 'List components',
    description:
      'Every item in the eoria registry with its name, title, description and type. `installed` says whether this app already has the item, and is null when the app has no eoria.json. Call it to see what exists before you build a component by hand.',
    inputSchema: noArguments,
    annotations: readOnly,
    run: (_args, context) => listItems(context.root, reading(context)),
  },
  {
    name: 'search_components',
    title: 'Search components',
    description:
      'Registry items whose name, title or description contains every word of the query, ignoring case. Name matches come first. Use it when you know what the UI needs, such as "menu" or "date", and not what eoria calls it. An empty `items` array means nothing matched.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 1,
          description: 'One or more words, for example "bottom sheet".',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: readOnly,
    run: (args, context) => searchItems(context.root, args.query as string, reading(context)),
  },
  {
    name: 'view_component',
    title: 'View a component',
    description:
      'One registry item with its npm dependencies, the registry items it pulls in, and each file with the path add_components would write it to. Set `source` to get the file contents as the registry has them now. For a component the app already has, read the file in the app instead, because the developer may have edited it.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, description: 'Item name, for example "select".' },
        source: {
          type: 'boolean',
          description: 'Include the contents of every file. Defaults to false.',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
    annotations: readOnly,
    run: (args, context) =>
      viewItem(context.root, args.name as string, {
        ...reading(context),
        source: args.source === true,
      }),
  },
  {
    name: 'get_docs',
    title: 'Read the docs',
    description:
      'A page of the eoria docs as Markdown. A component name such as "select" returns its usage examples and props. A guide slug such as "installation", "theming", "recipes" or "cli" returns that guide. Leave `topic` out to get llms.txt, the index of every page.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          minLength: 1,
          description: 'Component name or guide slug. "start/theming" names a page outright.',
        },
      },
      additionalProperties: false,
    },
    annotations: readOnly,
    run: async (args, context) => {
      const options = {
        ...reading(context),
        ...(context.docsUrl ? { docsUrl: context.docsUrl } : {}),
      }
      return (await fetchDocs(context.root, args.topic as string | undefined, options)).markdown
    },
  },
  {
    name: 'get_project_info',
    title: 'Project info',
    description:
      'How this app is set up for eoria. Returns where eoria.json is, the components folder and import alias, the registry in use, the package manager, whether the app uses Expo, the version ranges of @eoria/core and its peers, and every installed file with a status that says whether the developer edited it or the registry changed. Call it before you add or change components. `config.values` is null when the app has no eoria.json.',
    inputSchema: noArguments,
    annotations: readOnly,
    run: (_args, context) => projectInfo(context.root, reading(context)),
  },
  {
    name: 'run_doctor',
    title: 'Check the setup',
    description:
      'Runs the eleven setup checks of `eoria doctor` and changes nothing. Each check has a status of pass, warn or fail, a message and a remedy. Call it when components fail to compile, render without styles or throw on mount, and after you change the Babel config, tsconfig paths or the root layout.',
    inputSchema: noArguments,
    annotations: readOnly,
    run: (_args, context) => runDoctor(context.root, reading(context)),
  },
  {
    name: 'add_components',
    title: 'Add components',
    description:
      'Copies components and every registry item they depend on into the app, and records them in eoria.json. It never installs npm packages. `installCommand` in the result is the command for you to run afterwards, or null when package.json already lists everything. A file that exists and differs from the registry is skipped unless `overwrite` is true, and overwriting discards the edits in that file. Set `dryRun` to get the plan with nothing written. The app needs an eoria.json, which `npx @eoria/cli init` writes.',
    inputSchema: {
      type: 'object',
      properties: {
        names: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          minItems: 1,
          maxItems: 20,
          description: 'Item names, for example ["button", "select"].',
        },
        overwrite: {
          type: 'boolean',
          description: 'Replace files that already exist. Defaults to false.',
        },
        dryRun: {
          type: 'boolean',
          description: 'Return what would happen and write nothing. Defaults to false.',
        },
      },
      required: ['names'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    run: (args, context) =>
      addComponents(context, args.names as string[], {
        overwrite: args.overwrite === true,
        dryRun: args.dryRun === true,
      }),
  },
]

/** What `tools/list` returns. */
export function toolDefinitions(): ToolDefinition[] {
  return TOOLS.map(({ run: _run, ...definition }) => definition)
}

/** Runs a tool with arguments that already passed `checkArguments`. Throws when the tool fails. */
export async function callTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const tool = TOOLS.find((candidate) => candidate.name === name)
  if (!tool) throw new CliError(`Unknown tool: ${name}`)
  const result = await tool.run(args, context)
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  return { content: [{ type: 'text', text }] }
}

interface AddArguments {
  overwrite: boolean
  dryRun: boolean
}

let adding: Promise<unknown> = Promise.resolve()

/**
 * Requests run side by side, and two adds that both read `eoria.json` before either writes it
 * would lose one set of hashes. So each add waits for the one before it.
 */
function addComponents(context: ToolContext, names: string[], options: AddArguments) {
  const next = adding.then(() => addNow(context, names, options))
  adding = next.catch(() => {})
  return next
}

async function addNow(context: ToolContext, names: string[], options: AddArguments) {
  const { root } = context
  const config = await readConfigOrFail(root)
  if (!config) {
    throw new CliError(
      `No eoria.json in ${root}, so there is nowhere to add components. Run \`npx @eoria/cli init\` there first.`,
    )
  }
  const plan = await planAdd(root, config, names, {
    ...reading(context),
    overwrite: options.overwrite,
  })
  if (options.dryRun) {
    // File contents are large, and view_component returns them when they are wanted.
    const files = plan.files.map(({ content: _content, current: _current, ...file }) => file)
    return { ...plan, files }
  }
  const { written, skipped } = await writePlan(root, config, plan)
  return {
    written,
    skipped: skipped.map((file) => ({ target: file.target, edited: file.edited })),
    unchanged: plan.files.filter((file) => file.action === 'same').map((file) => file.target),
    installCommand: plan.installCommand,
  }
}

/** Checks arguments against a tool's schema. Returns what is wrong, or null. */
export function checkArguments(schema: InputSchema, args: Record<string, unknown>): string | null {
  for (const key of Object.keys(args)) {
    if (!(key in schema.properties)) {
      const known = Object.keys(schema.properties)
      return `"${key}" is not an argument. ${known.length > 0 ? `It takes ${known.join(', ')}.` : 'It takes none.'}`
    }
  }
  for (const key of schema.required ?? []) {
    if (args[key] === undefined) return `"${key}" is required.`
  }
  for (const [key, rule] of Object.entries(schema.properties)) {
    const value = args[key]
    if (value === undefined) continue
    if (rule.type === 'boolean') {
      if (typeof value !== 'boolean') return `"${key}" must be true or false.`
    } else if (rule.type === 'string') {
      if (typeof value !== 'string') return `"${key}" must be a string.`
      if (value.length < (rule.minLength ?? 0)) return `"${key}" must not be empty.`
    } else {
      if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
        return `"${key}" must be an array of strings.`
      }
      if (value.some((entry: string) => entry.length < (rule.items.minLength ?? 0))) {
        return `"${key}" must not hold an empty string.`
      }
      if (value.length < (rule.minItems ?? 0) || value.length > (rule.maxItems ?? Infinity)) {
        return `"${key}" takes ${rule.minItems ?? 0} to ${rule.maxItems} items, got ${value.length}.`
      }
    }
  }
  return null
}

/** The schema of a tool, or null when there is no such tool. */
export function toolSchema(name: string): InputSchema | null {
  return TOOLS.find((tool) => tool.name === name)?.inputSchema ?? null
}
