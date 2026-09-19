import { presets, type Preset, type PresetColors } from './presets'

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
  /** Fill of destructive buttons, badges and toasts. Pairs with `destructiveForeground`. */
  destructive: string
  destructiveForeground: string
  /**
   * Destructive as text, icon or border on `background`, `surface` and `elevated`: field
   * errors, invalid borders, destructive menu rows. The dark fill is too dim to read there.
   */
  destructiveText: string
  border: string
  input: string
  ring: string
}

export type SpaceKey = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16
/**
 * `sm` to `full` are the raw steps. `control` is the corner of buttons, fields, chips and
 * segmented tabs; `card` the corner of cards, contained accordions and alerts. A preset
 * sets them independently, which is what lets one look be pill-shaped and another square.
 */
export type RadiusKey = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'control' | 'card'
export type FontSizeKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
export type FontWeightKey = 'normal' | 'medium' | 'semibold' | 'bold'
export type ControlSizeKey = 'sm' | 'md' | 'lg'

/** A font family per platform. `web` is a CSS font-family list for the docs mirrors. */
export type PlatformFont = { ios: string; android: string; web: string }

export interface EoriaTheme {
  colors: EoriaColors
  space: Record<SpaceKey, number>
  radius: Record<RadiusKey, number>
  fontSize: Record<FontSizeKey, number>
  lineHeight: Record<FontSizeKey, number>
  fontWeight: Record<FontWeightKey, '400' | '500' | '600' | '700'>
  /** Heights of buttons, fields, select triggers and OTP cells. */
  control: Record<ControlSizeKey, number>
  /** Hairline around cards, contained accordions, alerts and filled fields. 0 is a filled look, 1 an outlined one. */
  stroke: number
  /** Shadow under elevated cards, menus, popovers and toasts. */
  shadow: { opacity: number; radius: number; offset: number }
  /** Families for body and heading text. Absent keys use the system font. */
  font: { body?: PlatformFont; heading?: PlatformFont }
}

/** Shared by every preset. */
const scale = {
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 },
  lineHeight: { xs: 16, sm: 20, md: 24, lg: 28, xl: 28, '2xl': 32, '3xl': 36 },
} satisfies Pick<EoriaTheme, 'space' | 'fontSize' | 'lineHeight'>

/** Light and dark themes from a preset: its palettes and shape on top of the shared scales. */
export function createThemes(preset: Preset): { light: EoriaTheme; dark: EoriaTheme } {
  const { light, dark, ...shape } = preset
  // A preset written before `destructiveText` existed keeps working with the fill colour.
  const colors = (palette: PresetColors): EoriaColors => ({
    ...palette,
    destructiveText: palette.destructiveText ?? palette.destructive,
  })
  return {
    light: { colors: colors(light), ...scale, ...shape },
    dark: { colors: colors(dark), ...scale, ...shape },
  }
}

const zinc = createThemes(presets.zinc)
export const lightTheme: EoriaTheme = zinc.light
export const darkTheme: EoriaTheme = zinc.dark
export const defaultThemes = { light: lightTheme, dark: darkTheme }
