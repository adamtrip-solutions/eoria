import { configureUnistyles } from '../configure'
import { darkTheme, lightTheme } from '../theme'

// A stand-in for the native StyleSheet.configure of react-native-unistyles 3
// (cxx/hybridObjects/HybridStyleSheet.cpp: parseSettings and
// verifyAndSelectTheme). Settings persist between calls, an omitted field keeps
// its previous value, and the adaptive flag is stored before the colour scheme
// check throws.
type Settings = { adaptiveThemes?: boolean; initialTheme?: string | (() => string) }

const mockNative = {
  colorScheme: 'unspecified' as 'light' | 'dark' | 'unspecified',
  themes: new Set<string>(),
  prefersAdaptive: undefined as boolean | undefined,
  initialTheme: undefined as string | undefined,
  theme: undefined as string | undefined,
  calls: [] as Settings[],
  reset() {
    this.colorScheme = 'unspecified'
    this.themes = new Set()
    this.prefersAdaptive = undefined
    this.initialTheme = undefined
    this.theme = undefined
    this.calls = []
  },
  configure(config: { themes?: Record<string, unknown>; settings?: Settings }) {
    this.calls.push({ ...config.settings })
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
      throw new Error("You're trying to enable adaptiveThemes, but you didn't register both")
    }
    if (this.initialTheme === undefined && !adaptive) {
      if (this.themes.size === 1) this.theme = [...this.themes][0]
      return
    }
    if (this.initialTheme === undefined) {
      if (this.colorScheme === 'unspecified') {
        throw new Error("Unable to set adaptive theme as your device doesn't support it.")
      }
      this.theme = this.colorScheme
      return
    }
    if (adaptive) throw new Error('initial theme and adaptiveThemes are mutually exclusive')
    if (!this.themes.has(this.initialTheme)) throw new Error('theme was not registered')
    this.theme = this.initialTheme
  },
}

jest.mock('react-native-unistyles', () => ({
  StyleSheet: { configure: (config: never) => mockNative.configure(config) },
}))

const themes = { light: lightTheme, dark: darkTheme } as never

beforeEach(() => mockNative.reset())

describe('configureUnistyles', () => {
  it('follows the OS scheme with adaptive themes', () => {
    mockNative.colorScheme = 'dark'
    configureUnistyles({ themes })
    expect(mockNative.theme).toBe('dark')
    expect(mockNative.prefersAdaptive).toBe(true)
    expect(mockNative.calls).toEqual([{ adaptiveThemes: true }])
  })

  it('starts on light when the OS reports no scheme', () => {
    expect(() => configureUnistyles({ themes })).not.toThrow()
    expect(mockNative.theme).toBe('light')
    expect(mockNative.prefersAdaptive).toBe(false)
  })

  it('survives a second run after the light fallback', () => {
    configureUnistyles({ themes })
    mockNative.colorScheme = 'dark'
    expect(() => configureUnistyles({ themes })).not.toThrow()
    expect(mockNative.theme).toBe('light')
  })

  it('survives a second run after adaptive themes were on', () => {
    mockNative.colorScheme = 'light'
    configureUnistyles({ themes })
    expect(() => configureUnistyles({ themes })).not.toThrow()
    expect(mockNative.theme).toBe('light')
    expect(mockNative.prefersAdaptive).toBe(true)
  })

  it('passes explicit settings through without a fallback', () => {
    expect(() => configureUnistyles({ themes, settings: { adaptiveThemes: true } })).toThrow(
      /doesn't support it/,
    )
    expect(mockNative.calls).toEqual([{ adaptiveThemes: true }])

    mockNative.reset()
    configureUnistyles({ themes, settings: { initialTheme: 'dark' as never } })
    expect(mockNative.theme).toBe('dark')
    expect(mockNative.calls).toEqual([{ initialTheme: 'dark' }])
  })

  it('keeps the original error when light or dark is missing', () => {
    expect(() => configureUnistyles({ themes: { light: lightTheme } as never })).toThrow(
      /didn't register both/,
    )
    expect(mockNative.calls).toHaveLength(1)
  })
})
