import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface RegistryFile {
  path: string
  type: string
  target?: string
  content: string
}

export interface RegistryItem {
  name: string
  type: string
  description?: string
  dependencies?: string[]
  registryDependencies?: string[]
  files: RegistryFile[]
}

export interface RegistryIndex {
  name: string
  homepage?: string
  items: Array<Omit<RegistryItem, 'files'> & { files: Array<Omit<RegistryFile, 'content'>> }>
}

export class RegistryError extends Error {}

/** Reads items from an http(s) registry or, for development, a local directory. */
export class Registry {
  private cache = new Map<string, Promise<RegistryItem>>()

  constructor(readonly base: string) {}

  private get isRemote(): boolean {
    return /^https?:\/\//.test(this.base)
  }

  private async readJson<T>(name: string): Promise<T> {
    if (this.isRemote) {
      const url = `${this.base.replace(/\/$/, '')}/${name}.json`
      let res: Response
      try {
        res = await fetch(url)
      } catch (error) {
        throw new RegistryError(`could not reach ${url}: ${(error as Error).message}`)
      }
      if (!res.ok) throw new RegistryError(`${url} responded ${res.status}`)
      return (await res.json()) as T
    }
    try {
      return JSON.parse(await readFile(resolve(this.base, `${name}.json`), 'utf8')) as T
    } catch {
      throw new RegistryError(`${name}.json not found in ${this.base}`)
    }
  }

  index(): Promise<RegistryIndex> {
    return this.readJson<RegistryIndex>('index')
  }

  item(name: string): Promise<RegistryItem> {
    let pending = this.cache.get(name)
    if (!pending) {
      pending = this.readJson<RegistryItem>(name)
      this.cache.set(name, pending)
    }
    return pending
  }

  /** Every item the given names need, dependencies first, each once. */
  async resolve(names: string[]): Promise<RegistryItem[]> {
    const ordered: RegistryItem[] = []
    const seen = new Set<string>()
    const visit = async (name: string, trail: string[]) => {
      if (seen.has(name)) return
      if (trail.includes(name)) {
        throw new RegistryError(`circular registryDependencies: ${[...trail, name].join(' > ')}`)
      }
      const item = await this.item(name)
      for (const dep of item.registryDependencies ?? []) await visit(dep, [...trail, name])
      if (!seen.has(name)) {
        seen.add(name)
        ordered.push(item)
      }
    }
    for (const name of names) await visit(name, [])
    return ordered
  }
}
