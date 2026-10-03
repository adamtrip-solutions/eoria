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
 * Thin wrapper over `StyleSheet.configure` with eoria defaults:
 * the neutral light/dark themes and adaptive themes enabled.
 * Call once, before any component renders. Recipes create their stylesheet
 * lazily, so importing components before this call is safe.
 *
 * Without `settings`, a device that reports no colour scheme starts on the
 * light theme with adaptive themes off. Settings you pass go through unchanged.
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
    // Native configure throws when the OS reports no colour scheme, and when a
    // previous call (Fast Refresh) left an initial theme behind. Without both
    // themes the error is the caller's to fix.
    if (!('light' in themes && 'dark' in themes)) throw error
    // Native keeps the adaptive flag the failed call set, so turn it off here.
    configure({ initialTheme: 'light' as keyof UnistylesThemes, adaptiveThemes: false })
  }
}
