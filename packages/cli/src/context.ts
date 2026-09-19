import { DEFAULT_REGISTRY, readConfig, type EoriaConfig } from './config'
import { CliError } from './log'
import { Registry } from './registry'

/** Options every command that only reads accepts. */
export interface ReadOptions {
  registry?: string
}

export interface Context {
  /** Null outside a project, where the read commands still work. */
  config: EoriaConfig | null
  registry: Registry
  /** Where the registry location came from. */
  registrySource: 'flag' | 'eoria.json' | 'default'
}

/** `readConfig`, with a parse failure turned into an error the CLI prints without a stack. */
export async function readConfigOrFail(root: string): Promise<EoriaConfig | null> {
  try {
    return await readConfig(root)
  } catch (error) {
    throw new CliError(`eoria.json does not parse: ${(error as Error).message}`)
  }
}

/** The registry to read from. `--registry` wins, then `eoria.json`, then the default. */
export function pickRegistry(
  config: EoriaConfig | null,
  options: ReadOptions,
): Pick<Context, 'registry' | 'registrySource'> {
  if (options.registry) return { registry: new Registry(options.registry), registrySource: 'flag' }
  if (config) return { registry: new Registry(config.registry), registrySource: 'eoria.json' }
  return { registry: new Registry(DEFAULT_REGISTRY), registrySource: 'default' }
}

export async function loadContext(root: string, options: ReadOptions): Promise<Context> {
  const config = await readConfigOrFail(root)
  return { config, ...pickRegistry(config, options) }
}
