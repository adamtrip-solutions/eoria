/**
 * Jest mock for react-native-unistyles that understands variants.
 *
 * The official `react-native-unistyles/mocks` strips variants entirely, which
 * makes recipe output untestable. This mock resolves `variants` and
 * `compoundVariants` in JS the same way the web runtime does, so tests can
 * assert on the styles a component actually receives.
 *
 * Usage in jest config: `setupFiles: ['@eoria/core/jest']`
 */

declare const require: (id: string) => unknown

type Selection = Record<string, string | boolean | undefined>
type AnyStyle = Record<string, unknown>

const registry: { themes: Record<string, unknown>; themeName: string | undefined } = {
  themes: {},
  themeName: undefined,
}

const currentTheme = (): unknown =>
  (registry.themeName ? registry.themes[registry.themeName] : undefined) ??
  Object.values(registry.themes)[0] ??
  {}

const isObject = (v: unknown): v is AnyStyle =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

// Native layers variant styles with a shallow property set (Helpers.h
// mergeJSIObjects), so nested objects such as shadowOffset replace, not merge.
const shallowMerge = (...objects: Array<AnyStyle | undefined>): AnyStyle =>
  Object.assign({}, ...objects)

const applyVariants = (style: AnyStyle, selection: Selection): AnyStyle => {
  const {
    variants,
    compoundVariants,
    uni__dependencies: _deps,
    ...base
  } = style as {
    variants?: Record<string, Record<string, AnyStyle>>
    compoundVariants?: Array<AnyStyle & { styles: AnyStyle }>
    uni__dependencies?: unknown
  }

  // Native: an explicitly selected but unknown value applies nothing; only an
  // undefined selection falls back to the `default` key.
  const picked = Object.entries(variants ?? {}).map(([name, values]) => {
    const selected = selection[name]
    if (selected === undefined) return values['default'] ?? {}
    return values[String(selected)] ?? {}
  })

  // Native only compares `when` keys that are present in the selection.
  const compound = (compoundVariants ?? [])
    .filter(({ styles: _s, ...when }) =>
      Object.entries(when).every(
        ([name, value]) =>
          selection[name] === undefined || String(selection[name]) === String(value),
      ),
    )
    .map((cv) => cv.styles)

  return shallowMerge(base, ...picked, ...compound)
}

const createSheet = (input: unknown): AnyStyle => {
  // Lazy like the native runtime: the factory runs against the theme that is
  // active when styles are read, not when the sheet is created.
  const getRaw = (): AnyStyle =>
    typeof input === 'function'
      ? (input as (t: unknown, rt: unknown) => AnyStyle)(currentTheme(), miniRuntime)
      : (input as AnyStyle)

  const bind = (selection: Selection): AnyStyle => {
    const bound: AnyStyle = {}
    for (const [name, style] of Object.entries(getRaw())) {
      bound[name] = isObject(style) ? applyVariants(style, selection) : style
    }
    return bound
  }

  return new Proxy({} as AnyStyle, {
    get: (_target, prop) => {
      if (prop === 'useVariants') return bind
      if (typeof prop !== 'string') return undefined
      return bind({})[prop]
    },
    ownKeys: () => Object.keys(getRaw()),
    getOwnPropertyDescriptor: (_target, prop) =>
      typeof prop === 'string' && prop in getRaw()
        ? { enumerable: true, configurable: true, value: bind({})[prop] }
        : undefined,
  })
}

const miniRuntime = {
  themeName: undefined as string | undefined,
  breakpoint: undefined,
  hasAdaptiveThemes: false,
  colorScheme: 'unspecified',
  contentSizeCategory: 'Medium',
  insets: { top: 0, left: 0, right: 0, bottom: 0, ime: 0 },
  pixelRatio: 1,
  fontScale: 1,
  rtl: false,
  isLandscape: false,
  isPortrait: true,
  navigationBar: { width: 0, height: 0 },
  screen: { width: 0, height: 0 },
  statusBar: { width: 0, height: 0 },
}

jest.mock(
  'react-native-nitro-modules',
  () => ({
    NitroModules: {
      createHybridObject: () => ({
        add: () => {},
        init: () => {},
        createHybridStatusBar: () => ({ setStyle: () => {} }),
        createHybridNavigationBar: () => {},
      }),
    },
  }),
  { virtual: true },
)

jest.mock('react-native-unistyles', () => {
  const React = require('react') as typeof import('react')

  const UnistylesRuntime = {
    get themeName() {
      return registry.themeName ?? Object.keys(registry.themes)[0]
    },
    colorScheme: 'unspecified',
    hasAdaptiveThemes: false,
    getTheme: (name?: string) => (name ? registry.themes[name] : currentTheme()),
    setTheme: (name: string) => {
      registry.themeName = name
    },
    updateTheme: (name: string, updater: (t: unknown) => unknown) => {
      registry.themes[name] = updater(registry.themes[name])
    },
    setAdaptiveThemes: () => {},
    setRootViewBackgroundColor: () => {},
    insets: miniRuntime.insets,
    screen: miniRuntime.screen,
    statusBar: { ...miniRuntime.statusBar, setHidden: () => {}, setStyle: () => {} },
    navigationBar: { ...miniRuntime.navigationBar, setHidden: () => {} },
    miniRuntime,
  }

  return {
    UnistylesRuntime,
    UnistyleDependency: { Theme: 0, ThemeName: 1, AdaptiveThemes: 2, Breakpoints: 3, Variants: 4 },
    mq: { only: { width: () => ({}), height: () => ({}) }, width: () => ({}), height: () => ({}) },
    Hide: () => null,
    Display: () => null,
    ScopedTheme: ({ children }: { children?: unknown }) => children ?? null,
    useUnistyles: () => ({ theme: currentTheme(), rt: UnistylesRuntime }),
    withUnistyles: (Component: never) => (props: object) => React.createElement(Component, props),
    StyleSheet: {
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      flatten: (s: unknown) => s,
      compose: (a: unknown, b: unknown) => [a, b],
      hairlineWidth: 1,
      create: createSheet,
      configure: (config: {
        themes?: Record<string, unknown>
        settings?: { initialTheme?: string | (() => string) }
      }) => {
        registry.themes = config.themes ?? {}
        const initial = config.settings?.initialTheme
        registry.themeName = typeof initial === 'function' ? initial() : initial
      },
    },
  }
})

export {}
