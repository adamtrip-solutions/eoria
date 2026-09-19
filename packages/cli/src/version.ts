declare const __EORIA_CLI_VERSION__: string | undefined

/** tsup replaces the constant with the version in package.json. Tests run unbundled. */
export const CLI_VERSION =
  typeof __EORIA_CLI_VERSION__ === 'string' ? __EORIA_CLI_VERSION__ : '0.0.0-dev'
