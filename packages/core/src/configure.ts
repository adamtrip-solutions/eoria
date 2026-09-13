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
 */
export function configureUnistyles(options: ConfigureOptions = {}): void {
  const themes = (options.themes ?? defaultThemes) as UnistylesThemes
  const settings = options.settings ?? { adaptiveThemes: true }
  StyleSheet.configure({
    themes,
    ...(options.breakpoints ? { breakpoints: options.breakpoints } : {}),
    settings: settings as never,
  })
}
