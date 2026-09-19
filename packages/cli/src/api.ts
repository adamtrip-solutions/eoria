/**
 * The functions behind the commands, without the printing. Each returns a plain object that
 * survives `JSON.stringify`, and throws `CliError` or `RegistryError` on a problem the user
 * can fix.
 */
export {
  planAdd,
  writePlan,
  type AddPlan,
  type PlannedFile,
  type WrittenPlan,
} from './commands/add'
export { docsBaseUrl, docsPaths, fetchDocs, type FetchedDocs } from './commands/docs'
export {
  runDoctor,
  type CheckId,
  type CheckStatus,
  type DoctorCheck,
  type DoctorReport,
} from './commands/doctor'
export {
  projectInfo,
  type InfoFileStatus,
  type InstalledFile,
  type InstalledItem,
  type ProjectInfo,
} from './commands/info'
export {
  ITEM_TYPES,
  listItems,
  type ItemList,
  type ItemType,
  type ListedItem,
  type ListReadOptions,
} from './commands/list'
export { initMcpClient, type McpClient, type McpInitResult } from './commands/mcp'
export { searchItems, type SearchResult } from './commands/search'
export { viewItem, type ViewedFile, type ViewedItem } from './commands/view'
export { findProjectRoot, readConfig, type EoriaConfig } from './config'
export { blocksDirectory, localPath, type Directories } from './files'
export { CliError } from './log'
export {
  PROTOCOL_VERSIONS,
  createMcpServer,
  type McpServer,
  type McpServerOptions,
} from './mcp/server'
export { type ToolContext, type ToolDefinition, type ToolResult } from './mcp/tools'
export { reserveStdout } from './print'
export { RegistryError } from './registry'
