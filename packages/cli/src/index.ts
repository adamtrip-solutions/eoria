import { Command } from 'commander'
import { findProjectRoot } from './config'
import { add } from './commands/add'
import { diff } from './commands/diff'
import { docs } from './commands/docs'
import { doctor } from './commands/doctor'
import { extend } from './commands/extend'
import { info } from './commands/info'
import { init } from './commands/init'
import { list } from './commands/list'
import { mcp, mcpInit } from './commands/mcp'
import { search } from './commands/search'
import { view } from './commands/view'
import { CliError, log } from './log'
import { RegistryError } from './registry'
import { CLI_VERSION } from './version'

const program = new Command()
  .name('eoria')
  .description('Copy eoria components into your React Native app')
  .version(CLI_VERSION)

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
  .option('--dry-run', 'print what add would write, skip, overwrite and install, and write nothing')
  .option('--diff', 'print the hunks between existing files and the registry, and write nothing')
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

program
  .command('list')
  .description('Print every item in the registry, marking the installed ones')
  .option('--json', 'print JSON')
  .option('--registry <url>', 'registry base URL or local directory')
  .action((options) => wrap(() => list(findProjectRoot(), options)))

program
  .command('search')
  .description('Find items by name, title or description')
  .argument('<query>', 'words to look for, e.g. menu')
  .option('--json', 'print JSON')
  .option('--registry <url>', 'registry base URL or local directory')
  .action((query: string, options) => wrap(() => search(findProjectRoot(), query, options)))

program
  .command('view')
  .description('Print what an item depends on and which files it writes')
  .argument('<item>', 'item name, e.g. select')
  .option('--source', 'print the file contents too')
  .option('--json', 'print JSON')
  .option('--registry <url>', 'registry base URL or local directory')
  .action((item: string, options) => wrap(() => view(findProjectRoot(), item, options)))

program
  .command('info')
  .description('Print the project setup, installed items and peer versions')
  .option('--json', 'print JSON')
  .option('--registry <url>', 'registry base URL or local directory')
  .action((options) => wrap(() => info(findProjectRoot(), options)))

program
  .command('docs')
  .description('Print a docs page as Markdown, or the page index when no topic is given')
  .argument('[topic]', 'component name or guide slug, e.g. select or theming')
  .option('--docs-url <url>', 'docs site URL or local build folder')
  .option('--registry <url>', 'registry base URL or local directory')
  .action((topic: string | undefined, options) =>
    wrap(() => docs(findProjectRoot(), topic, options)),
  )

program
  .command('doctor')
  .description('Check the project setup and exit with 1 when a check fails')
  .option('--fix', 'add the path alias, write unistyles.ts and install missing packages')
  .option('--json', 'print JSON')
  .option('--registry <url>', 'registry base URL or local directory')
  .action((options) => wrap(() => doctor(findProjectRoot(), options)))

const mcpCommand = program
  .command('mcp')
  .description('Serve the registry, the docs and this project to an agent over MCP on stdio')
  .option('--cwd <dir>', 'project folder, when the client starts the server somewhere else')
  .option('--registry <url>', 'registry base URL or local directory')
  .option('--docs-url <url>', 'docs site URL or local build folder')
  .action((options) => wrap(() => mcp(options)))

mcpCommand
  .command('init')
  .description('Add the eoria server to the MCP config of Claude Code, Cursor, VS Code or Codex')
  .option('--client <name>', 'claude, cursor, vscode or codex')
  .option('--force', 'replace an eoria entry that differs')
  .action((options) => wrap(() => mcpInit(findProjectRoot(), options)))

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
