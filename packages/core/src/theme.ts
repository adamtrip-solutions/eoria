import { colorPresets, type ColorPreset } from './presets'

/**
 * Semantic token schema shared by every registry component.
 *
 * The keys below are the fixed core. Apps may add extra keys by augmenting
 * `EoriaTheme` from `@eoria/core`:
 *
 * ```ts
 * declare module '@eoria/core' {
 *   interface EoriaTheme {
 *     brand: { primary: string }
 *   }
 * }
 * ```
 */
export interface EoriaColors {
  background: string
  foreground: string
  /** Card and tile fill, one step above `background`. Controls use `muted`, one step further. */
  surface: string
  /** Floating surfaces: menus, popovers, sheets. Lighter than `surface` in dark mode. */
  elevated: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
}

export type SpaceKey = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16
export type RadiusKey = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
export type FontSizeKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
export type FontWeightKey = 'normal' | 'medium' | 'semibold' | 'bold'

export interface EoriaTheme {
  colors: EoriaColors
  space: Record<SpaceKey, number>
  radius: Record<RadiusKey, number>
  fontSize: Record<FontSizeKey, number>
  lineHeight: Record<FontSizeKey, number>
  fontWeight: Record<FontWeightKey, '400' | '500' | '600' | '700'>
}

const scale = {
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, '2xl': 28, full: 9999 },
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 },
  lineHeight: { xs: 16, sm: 20, md: 24, lg: 28, xl: 28, '2xl': 32, '3xl': 36 },
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
} satisfies Omit<EoriaTheme, 'colors'>

/** Light and dark themes from a colour preset, sharing the standard scales. */
export function createThemes(preset: ColorPreset): { light: EoriaTheme; dark: EoriaTheme } {
  return {
    light: { colors: preset.light, ...scale },
    dark: { colors: preset.dark, ...scale },
  }
}

const zinc = createThemes(colorPresets.zinc)
export const lightTheme: EoriaTheme = zinc.light
export const darkTheme: EoriaTheme = zinc.dark
export const defaultThemes = { light: lightTheme, dark: darkTheme }
