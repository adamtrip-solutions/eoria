/**
 * The functions behind the commands, without the printing. Each returns a plain object that
 * survives `JSON.stringify`, and throws `CliError` or `RegistryError` on a problem the user
 * can fix.
 */
export { planAdd, type AddPlan, type PlannedFile } from './commands/add'
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
export { listItems, type ItemList, type ListedItem } from './commands/list'
export { searchItems, type SearchResult } from './commands/search'
export { viewItem, type ViewedFile, type ViewedItem } from './commands/view'
export { findProjectRoot, readConfig, type EoriaConfig } from './config'
export { CliError } from './log'
export { reserveStdout } from './print'
export { RegistryError } from './registry'
