import { configureUnistyles } from '../configure'
import { darkTheme, lightTheme } from '../theme'

type Settings = { adaptiveThemes?: boolean; initialTheme?: string | (() => string) }
type Config = {
  themes?: Record<string, unknown>
  breakpoints?: Record<string, number>
  settings?: Settings
}

// Stand-ins for StyleSheet.configure of react-native-unistyles 3.3.
//
// Native (cxx/hybridObjects/HybridStyleSheet.cpp: parseSettings, verifyAndSelectTheme,
// setThemeFromColorScheme): settings persist between calls, an omitted field keeps its previous
// value, and the adaptive flag is stored before the colour scheme check throws.
//
// Web (src/web/state.ts: init): marks itself initialised before it reads themes, breakpoints and
// settings, so every call after the first, failed or not, returns without doing anything. An
// unspecified scheme maps to light (src/web/utils/unistyle.ts: schemeToTheme).
const mockUnistyles = {
  platform: 'native' as 'native' | 'web',
  colorScheme: 'unspecified' as 'light' | 'dark' | 'unspecified',
  themes: new Set<string>(),
  prefersAdaptive: undefined as boolean | undefined,
  initialTheme: undefined as string | undefined,
  theme: undefined as string | undefined,
  webInitialised: false,
  calls: [] as Settings[],
  reset(platform: 'native' | 'web' = 'native') {
    this.platform = platform
    this.colorScheme = 'unspecified'
    this.themes = new Set()
    this.prefersAdaptive = undefined
    this.initialTheme = undefined
    this.theme = undefined
    this.webInitialised = false
    this.calls = []
  },
  configure(config: Config) {
    this.calls.push({ ...config.settings })
    if (this.platform === 'web') this.web(config)
    else this.native(config)
  },
  web(config: Config) {
    if (this.webInitialised) return
    this.webInitialised = true
    for (const [name, theme] of Object.entries(config.themes ?? {})) {
      Object.entries(theme as object) // throws a TypeError for null, like the CSS vars pass
      this.themes.add(name)
    }
    if (config.breakpoints) {
      const entries = Object.entries(config.breakpoints)
      if (entries.length === 0) throw new Error("breakpoints can't be empty.")
      if (entries[0]?.[1] !== 0) throw new Error('first breakpoint must start from 0.')
    }
    if (config.settings?.adaptiveThemes) {
      this.theme = this.colorScheme === 'dark' ? 'dark' : 'light'
      return
    }
    const initial = config.settings?.initialTheme
    if (initial !== undefined) this.theme = typeof initial === 'function' ? initial() : initial
  },
  native(config: Config) {
    for (const name of Object.keys(config.themes ?? {})) this.themes.add(name)
    const settings = config.settings ?? {}
    if (settings.adaptiveThemes !== undefined) this.prefersAdaptive = settings.adaptiveThemes
    if (settings.initialTheme !== undefined) {
      const initial = settings.initialTheme
      this.initialTheme = typeof initial === 'function' ? initial() : initial
    }
    const canAdapt = this.themes.has('light') && this.themes.has('dark')
    const adaptive = this.prefersAdaptive === true && canAdapt
    if (this.prefersAdaptive && !canAdapt) {
      throw new Error(
        "Unistyles: You're trying to enable adaptiveThemes, but you didn't register both 'light' and 'dark' themes.",
      )
    }
    if (this.initialTheme === undefined && !adaptive) {
      if (this.themes.size === 1) this.theme = [...this.themes][0]
      return
    }
    if (this.initialTheme === undefined) {
      if (this.colorScheme === 'unspecified') {
        throw new Error(
          "Unistyles: Unable to set adaptive theme as your device doesn't support it.",
        )
      }
      this.theme = this.colorScheme
      return
    }
    if (adaptive) {
      throw new Error(
        "Unistyles: You're trying to set initial theme and enable adaptiveThemes, but these options are mutually exclusive.",
      )
    }
    if (!this.themes.has(this.initialTheme)) throw new Error('theme was not registered')
    this.theme = this.initialTheme
  },
}

jest.mock('react-native-unistyles', () => ({
  StyleSheet: { configure: (config: never) => mockUnistyles.configure(config) },
}))

const themes = { light: lightTheme, dark: darkTheme } as never

beforeEach(() => mockUnistyles.reset())

describe('configureUnistyles on native', () => {
  it('follows the OS scheme with adaptive themes', () => {
    mockUnistyles.colorScheme = 'dark'
    configureUnistyles({ themes })
    expect(mockUnistyles.theme).toBe('dark')
    expect(mockUnistyles.calls).toEqual([{ adaptiveThemes: true }])
  })

  it('falls back to light when the OS reports no scheme', () => {
    expect(() => configureUnistyles({ themes })).not.toThrow()
    expect(mockUnistyles.theme).toBe('light')
    expect(mockUnistyles.calls).toEqual([
      { adaptiveThemes: true },
      { initialTheme: 'light', adaptiveThemes: false },
    ])
  })

  it('falls back again on the mutually exclusive error of a second run', () => {
    configureUnistyles({ themes })
    mockUnistyles.colorScheme = 'dark'
    mockUnistyles.calls = []
    expect(() => configureUnistyles({ themes })).not.toThrow()
    expect(mockUnistyles.theme).toBe('light')
    expect(mockUnistyles.calls).toEqual([
      { adaptiveThemes: true },
      { initialTheme: 'light', adaptiveThemes: false },
    ])
  })

  it('does not throw when run again after adaptive themes were on', () => {
    mockUnistyles.colorScheme = 'light'
    configureUnistyles({ themes })
    expect(() => configureUnistyles({ themes })).not.toThrow()
    expect(mockUnistyles.theme).toBe('light')
  })

  it('rethrows other errors without a second call', () => {
    expect(() => configureUnistyles({ themes: { light: lightTheme } as never })).toThrow(
      /didn't register both/,
    )
    expect(mockUnistyles.calls).toHaveLength(1)
  })

  it('passes explicit settings through without a fallback', () => {
    expect(() => configureUnistyles({ themes, settings: { adaptiveThemes: true } })).toThrow(
      /Unable to set adaptive theme/,
    )
    expect(mockUnistyles.calls).toEqual([{ adaptiveThemes: true }])

    mockUnistyles.reset()
    configureUnistyles({ themes, settings: { initialTheme: 'dark' as never } })
    expect(mockUnistyles.theme).toBe('dark')
    expect(mockUnistyles.calls).toEqual([{ initialTheme: 'dark' }])
  })
})

describe('configureUnistyles on web', () => {
  beforeEach(() => mockUnistyles.reset('web'))

  it('starts on light with no scheme and makes one call', () => {
    configureUnistyles({ themes })
    expect(mockUnistyles.theme).toBe('light')
    expect(mockUnistyles.calls).toHaveLength(1)
  })

  it.each([
    ['empty breakpoints', { themes, breakpoints: {} }, /can't be empty/],
    ['breakpoints not starting at 0', { themes, breakpoints: { md: 768 } }, /start from 0/],
    ['a null theme', { themes: { light: null, dark: darkTheme } }, TypeError],
  ])('rethrows %s instead of retrying into a no-op', (_name, options, expected) => {
    expect(() => configureUnistyles(options as never)).toThrow(expected as never)
    expect(mockUnistyles.calls).toHaveLength(1)
  })
})
