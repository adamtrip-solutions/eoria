import { StyleSheet } from 'react-native-unistyles'
import type { UnistylesBreakpoints, UnistylesThemes } from 'react-native-unistyles'
import { defaultThemes } from './theme'

type ThemeSettings =
  | { initialTheme: keyof UnistylesThemes | (() => keyof UnistylesThemes); adaptiveThemes?: false }
  | { adaptiveThemes?: boolean; initialTheme?: never }

export type ConfigureOptions = {
  themes?: UnistylesThemes
  breakpoints?: UnistylesBreakpoints
  settings?: ThemeSettings & { nativeBreakpointsMode?: 'pixels' | 'points'; CSSVars?: boolean }
}

/**
 * Native configure errors the default path recovers from, as of react-native-unistyles 3.3
 * (cxx/hybridObjects/HybridStyleSheet.cpp, verifyAndSelectTheme and setThemeFromColorScheme).
 * The first is thrown when adaptive themes are on and the OS reports no colour scheme. The
 * second is thrown when a later run (Fast Refresh) asks for adaptive themes after the light
 * fallback, because native keeps the initial theme from that earlier call. Every other error,
 * on any platform, reaches the caller.
 */
const RECOVERABLE = ['Unable to set adaptive theme', 'mutually exclusive']

const isRecoverable = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return RECOVERABLE.some((text) => message.includes(text))
}

/**
 * Thin wrapper over `StyleSheet.configure` with eoria defaults:
 * the neutral light/dark themes and adaptive themes enabled.
 * Call once, before any component renders. Recipes create their stylesheet
 * lazily, so importing components before this call is safe.
 *
 * Without `settings`, a device that reports no colour scheme starts on the
 * light theme with adaptive themes off, and running the default path again
 * does not throw. Settings you pass go through unchanged.
 */
export function configureUnistyles(options: ConfigureOptions = {}): void {
  const themes = (options.themes ?? defaultThemes) as UnistylesThemes
  const configure = (settings: ConfigureOptions['settings']) =>
    StyleSheet.configure({
      themes,
      ...(options.breakpoints ? { breakpoints: options.breakpoints } : {}),
      settings: settings as never,
    })

  if (options.settings) return configure(options.settings)
  try {
    configure({ adaptiveThemes: true })
  } catch (error) {
    if (!isRecoverable(error)) throw error
    // Native keeps the adaptive flag the failed call set, so turn it off here.
    configure({ initialTheme: 'light' as keyof UnistylesThemes, adaptiveThemes: false })
  }
}
