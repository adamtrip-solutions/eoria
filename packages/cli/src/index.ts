import { Command } from 'commander'
import { findProjectRoot } from './config'
import { add } from './commands/add'
import { diff } from './commands/diff'
import { extend } from './commands/extend'
import { init } from './commands/init'
import { CliError, log } from './log'
import { RegistryError } from './registry'

const program = new Command()
  .name('eoria')
  .description('Copy eoria components into your React Native app')
  .version('0.0.1')

program
  .command('init')
  .description(
    'Write eoria.json, the Unistyles setup file and the Babel config, then install peers',
  )
  .option('--registry <url>', 'registry base URL or local directory')
  .option('--dir <path>', 'components directory', undefined)
  .option('--alias <alias>', 'import alias for the components directory')
  .option('--no-install', 'print the install command instead of running it')
  .option('-y, --yes', 'run again even if eoria.json exists (existing files are kept)')
  .action((options) => wrap(() => init(findProjectRoot(), options)))

program
  .command('add')
  .description('Copy components and everything they depend on')
  .argument('<names...>', 'component names, e.g. button select')
  .option('--overwrite', 'replace files that already exist')
  .option('--no-install', 'skip installing npm dependencies')
  .option('--registry <url>', 'registry base URL or local directory')
  .action((names: string[], options) => wrap(() => add(findProjectRoot(), names, options)))

program
  .command('diff')
  .description('Compare installed components with the registry')
  .argument('[name]', 'one component, or every installed one')
  .option('--full', 'print whole files instead of changed hunks')
  .option('--registry <url>', 'registry base URL or local directory')
  .action((name: string | undefined, options) => wrap(() => diff(findProjectRoot(), name, options)))

program
  .command('extend')
  .description('Generate a component that extends an installed one')
  .argument('<base>', 'installed component, e.g. button')
  .argument('<name>', 'new component, e.g. checkout-button')
  .option('--overwrite', 'replace the file if it exists')
  .action((base: string, name: string, options) =>
    wrap(() => extend(findProjectRoot(), base, name, options)),
  )

program.parseAsync(process.argv)

async function wrap(task: () => Promise<void>) {
  try {
    await task()
  } catch (error) {
    if (error instanceof CliError || error instanceof RegistryError) {
      log.error(error.message)
      process.exitCode = 1
      return
    }
    throw error
  }
}
