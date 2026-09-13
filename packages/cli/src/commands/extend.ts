import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readConfig } from '../config'
import { assertPlainName, kebabCase, pascalCase } from '../files'
import { CliError, log } from '../log'

export interface ExtendOptions {
  overwrite?: boolean
}

export async function extend(root: string, base: string, name: string, options: ExtendOptions) {
  const config = await readConfig(root)
  if (!config) throw new CliError('No eoria.json here. Run `npx @eoria/cli init` first.')
  try {
    assertPlainName(base, 'base')
    assertPlainName(name, 'name')
  } catch (error) {
    throw new CliError((error as Error).message)
  }
  const baseFile = resolve(root, config.components, `${base}.tsx`)
  if (!existsSync(baseFile)) {
    throw new CliError(
      `${config.components}/${base}.tsx not found. Run \`eoria add ${base}\` first.`,
    )
  }
  const source = await readFile(baseFile, 'utf8')
  const recipe = /export const (\w+Recipe)\b/.exec(source)?.[1]
  if (!recipe)
    throw new CliError(`${base}.tsx does not export a recipe, so there is nothing to extend.`)
  const factory = /export (?:function|const) (create\w+)\b/.exec(source)?.[1]

  const component = pascalCase(name)
  const file = kebabCase(name)
  const target = resolve(root, config.components, `${file}.tsx`)
  if (existsSync(target) && !options.overwrite) {
    throw new CliError(`${config.components}/${file}.tsx exists. Pass --overwrite to replace it.`)
  }
  const recipeName = `${component[0]!.toLowerCase()}${component.slice(1)}Recipe`

  const body = factory
    ? `export const ${component} = ${factory}(${recipeName})\n`
    : `// ${base}.tsx has no create* factory. Render the base component with \`styles\` from this
// recipe, or copy its render body here and call useRecipe(${recipeName}, ...).\n`

  const content = `import { extendSlotRecipe } from '@eoria/core'
import { ${recipe}${factory ? `, ${factory}` : ''} } from '${config.alias}/${base}'

/** ${component}: derived from ${base}. Edits to ${base}.tsx flow through. */
export const ${recipeName} = extendSlotRecipe(${recipe}, (theme) => ({
  slots: {
    root: {},
  },
  variants: {},
  defaultVariants: {},
}))

${body}`
  await writeFile(target, content)
  log.ok(`${config.components}/${file}.tsx`)
  log.info(
    log.dim(
      `Fill in slots, variants and defaultVariants. Unused: theme parameter until you read from it.`,
    ),
  )
}
