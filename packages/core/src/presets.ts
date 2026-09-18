import type { EoriaColors, EoriaTheme, PlatformFont } from './theme'

/**
 * Presets: six complete looks. Each one carries a light and a dark palette plus the shape
 * of the components: radii, control heights, stroke, shadow, weights and fonts. Switching
 * preset changes how every component is built, not only its accent. `zinc` is the default.
 *
 * `zinc` and `moss` use fonts the platform ships. The others name a family the app has to
 * embed. The Fonts section of the theming guide shows how.
 */
export type Preset = Omit<EoriaTheme, 'colors' | 'space' | 'fontSize' | 'lineHeight'> & {
  light: EoriaColors
  dark: EoriaColors
}

/**
 * A bundled family, addressed by its family name on every platform so `fontWeight` picks
 * the face. The web list also names the variable build that Fontsource publishes.
 */
const family = (name: string, fallback: 'sans-serif' | 'serif' = 'sans-serif'): PlatformFont => ({
  ios: name,
  android: name,
  web: `'${name}', '${name} Variable', ${fallback === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif'}`,
})

/** Neutral and native. Black primary, grey surfaces, the radii of the platform. */
const zinc: Preset = {
  light: {
    background: '#ffffff',
    foreground: '#0a0a0a',
    surface: '#f5f5f5',
    elevated: '#ffffff',
    primary: '#171717',
    primaryForeground: '#fafafa',
    secondary: '#e9e9e9',
    secondaryForeground: '#171717',
    muted: '#e9e9e9',
    mutedForeground: '#6b6b6b',
    accent: '#e4e4e7',
    accentForeground: '#171717',
    destructive: '#dc2626',
    destructiveForeground: '#fafafa',
    border: '#e5e5e5',
    input: '#e5e5e5',
    ring: '#a1a1a1',
  },
  dark: {
    background: '#0a0a0a',
    foreground: '#fafafa',
    surface: '#171717',
    elevated: '#222222',
    primary: '#fafafa',
    primaryForeground: '#171717',
    secondary: '#2a2a2a',
    secondaryForeground: '#fafafa',
    muted: '#2a2a2a',
    mutedForeground: '#a1a1a1',
    accent: '#333333',
    accentForeground: '#fafafa',
    destructive: '#7f1d1d',
    destructiveForeground: '#fafafa',
    border: '#262626',
    input: '#262626',
    ring: '#525252',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, '2xl': 28, full: 9999, control: 12, card: 20 },
  control: { sm: 40, md: 52, lg: 56 },
  stroke: 0,
  shadow: { opacity: 0.12, radius: 16, offset: 6 },
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
  font: {},
}

/** Warm and soft. Paper backgrounds, a deep green primary, pill controls, tall and airy, serif headings. */
const moss: Preset = {
  light: {
    background: '#faf8f3',
    foreground: '#1c1a15',
    surface: '#f0ece2',
    elevated: '#ffffff',
    primary: '#2f6b3f',
    primaryForeground: '#f4fbf5',
    secondary: '#e4dfd2',
    secondaryForeground: '#1c1a15',
    muted: '#e4dfd2',
    mutedForeground: '#716b5e',
    accent: '#dcebd9',
    accentForeground: '#1f4a2b',
    destructive: '#b93a2b',
    destructiveForeground: '#fff5f3',
    border: '#e0dacd',
    input: '#e0dacd',
    ring: '#2f6b3f',
  },
  dark: {
    background: '#14130f',
    foreground: '#f2eee4',
    surface: '#1f1d17',
    elevated: '#2b2821',
    primary: '#7fc48f',
    primaryForeground: '#0f2214',
    secondary: '#2f2c24',
    secondaryForeground: '#f2eee4',
    muted: '#2f2c24',
    mutedForeground: '#a59f90',
    accent: '#24362a',
    accentForeground: '#d7f0dc',
    destructive: '#8a2c22',
    destructiveForeground: '#fff5f3',
    border: '#2c2922',
    input: '#2c2922',
    ring: '#7fc48f',
  },
  radius: { sm: 10, md: 16, lg: 22, xl: 28, '2xl': 36, full: 9999, control: 9999, card: 28 },
  control: { sm: 44, md: 56, lg: 60 },
  stroke: 0,
  shadow: { opacity: 0.16, radius: 28, offset: 12 },
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '600' },
  font: {
    heading: { ios: 'Georgia', android: 'serif', web: 'Georgia, "Times New Roman", serif' },
  },
}

/** Cool and sharp. Slate neutrals, a cobalt primary, outlined cards and fields, compact controls, heavy IBM Plex Sans. */
const cobalt: Preset = {
  light: {
    background: '#ffffff',
    foreground: '#0b1220',
    surface: '#f8fafc',
    elevated: '#ffffff',
    primary: '#1d4ed8',
    primaryForeground: '#f5f8ff',
    secondary: '#e6ecf3',
    secondaryForeground: '#0b1220',
    muted: '#eef2f7',
    mutedForeground: '#5b6678',
    accent: '#dbe6ff',
    accentForeground: '#1e3a8a',
    destructive: '#dc2626',
    destructiveForeground: '#fff5f5',
    border: '#cfd8e3',
    input: '#b7c3d3',
    ring: '#1d4ed8',
  },
  dark: {
    background: '#0b1220',
    foreground: '#e6edf7',
    surface: '#0f172a',
    elevated: '#1b2740',
    primary: '#60a5fa',
    primaryForeground: '#06101f',
    secondary: '#223150',
    secondaryForeground: '#e6edf7',
    muted: '#223150',
    mutedForeground: '#94a3b8',
    accent: '#1e2f52',
    accentForeground: '#dbe6ff',
    destructive: '#991b1b',
    destructiveForeground: '#fff5f5',
    border: '#243554',
    input: '#34496f',
    ring: '#60a5fa',
  },
  radius: { sm: 4, md: 6, lg: 8, xl: 10, '2xl': 12, full: 9999, control: 6, card: 8 },
  control: { sm: 34, md: 42, lg: 48 },
  stroke: 1,
  shadow: { opacity: 0.06, radius: 8, offset: 2 },
  fontWeight: { normal: '400', medium: '600', semibold: '700', bold: '700' },
  font: { body: family('IBM Plex Sans') },
}

/**
 * Product and fintech. A cool grey canvas with white hairline cards, the inverse of `zinc`,
 * an indigo primary, mid-height controls and Geist throughout.
 */
const iris: Preset = {
  light: {
    background: '#f6f7f9',
    foreground: '#12131a',
    surface: '#ffffff',
    elevated: '#ffffff',
    primary: '#4a44d4',
    primaryForeground: '#ffffff',
    secondary: '#e5e8ef',
    secondaryForeground: '#12131a',
    muted: '#e9ebf1',
    mutedForeground: '#5f6577',
    accent: '#e7e6fb',
    accentForeground: '#352fa8',
    destructive: '#d92d20',
    destructiveForeground: '#ffffff',
    border: '#e2e5eb',
    input: '#d3d8e2',
    ring: '#4a44d4',
  },
  dark: {
    background: '#0c0d11',
    foreground: '#eceef4',
    surface: '#15171d',
    elevated: '#1e2129',
    primary: '#6a64ea',
    primaryForeground: '#ffffff',
    secondary: '#242730',
    secondaryForeground: '#eceef4',
    muted: '#242730',
    mutedForeground: '#9aa1b2',
    accent: '#25244d',
    accentForeground: '#d6d5fd',
    destructive: '#b42318',
    destructiveForeground: '#ffffff',
    border: '#262933',
    input: '#343846',
    ring: '#8985f2',
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 18, '2xl': 24, full: 9999, control: 10, card: 16 },
  control: { sm: 36, md: 46, lg: 52 },
  stroke: 1,
  shadow: { opacity: 0.08, radius: 14, offset: 4 },
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
  font: { body: family('Geist') },
}

/**
 * Tonal and calm. Every neutral carries the petrol hue of the primary, surfaces are filled,
 * corners are large and soft, and Manrope runs a step heavier than the other presets.
 */
const tide: Preset = {
  light: {
    background: '#f5f9f9',
    foreground: '#0c1c1e',
    surface: '#e7f0f0',
    elevated: '#ffffff',
    primary: '#0a6468',
    primaryForeground: '#f0fafa',
    secondary: '#d7e5e5',
    secondaryForeground: '#0c1c1e',
    muted: '#d7e5e5',
    mutedForeground: '#4b5f62',
    accent: '#c6e4e2',
    accentForeground: '#07474a',
    destructive: '#c8372d',
    destructiveForeground: '#fff6f5',
    border: '#cfdddd',
    input: '#c3d4d4',
    ring: '#0a6468',
  },
  dark: {
    background: '#071314',
    foreground: '#e6f1f1',
    surface: '#0f2022',
    elevated: '#1a2f32',
    primary: '#6ad1c8',
    primaryForeground: '#04211f',
    secondary: '#1b3336',
    secondaryForeground: '#e6f1f1',
    muted: '#1b3336',
    mutedForeground: '#94aaad',
    accent: '#123f40',
    accentForeground: '#c8f0ec',
    destructive: '#9b2c24',
    destructiveForeground: '#fff6f5',
    border: '#1a2e31',
    input: '#2a484c',
    ring: '#6ad1c8',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 22, '2xl': 30, full: 9999, control: 16, card: 26 },
  control: { sm: 40, md: 50, lg: 58 },
  stroke: 0,
  shadow: { opacity: 0.14, radius: 22, offset: 10 },
  fontWeight: { normal: '500', medium: '600', semibold: '700', bold: '700' },
  font: { body: family('Manrope') },
}

/**
 * Editorial and spare. Stone neutrals, an aubergine primary, tall controls with nearly
 * square corners, light weights, Newsreader headings over Instrument Sans.
 */
const plum: Preset = {
  light: {
    background: '#ffffff',
    foreground: '#1a1517',
    surface: '#f5f3f1',
    elevated: '#ffffff',
    primary: '#5a2348',
    primaryForeground: '#fbf3f8',
    secondary: '#eae7e4',
    secondaryForeground: '#1a1517',
    muted: '#eae7e4',
    mutedForeground: '#6c6366',
    accent: '#f1e4ec',
    accentForeground: '#5a2348',
    destructive: '#c4321f',
    destructiveForeground: '#fff6f3',
    border: '#e2dedb',
    input: '#e2dedb',
    ring: '#5a2348',
  },
  dark: {
    background: '#120e10',
    foreground: '#f3eef0',
    surface: '#1c1619',
    elevated: '#292024',
    primary: '#e0b3d3',
    primaryForeground: '#2b0f22',
    secondary: '#2d2529',
    secondaryForeground: '#f3eef0',
    muted: '#2d2529',
    mutedForeground: '#a99da3',
    accent: '#3a2033',
    accentForeground: '#f1d9e9',
    destructive: '#a12c1c',
    destructiveForeground: '#fff6f3',
    border: '#2b2327',
    input: '#2b2327',
    ring: '#e0b3d3',
  },
  radius: { sm: 2, md: 4, lg: 6, xl: 10, '2xl': 14, full: 9999, control: 4, card: 10 },
  control: { sm: 40, md: 52, lg: 58 },
  stroke: 0,
  shadow: { opacity: 0.1, radius: 24, offset: 10 },
  fontWeight: { normal: '400', medium: '500', semibold: '500', bold: '600' },
  font: { body: family('Instrument Sans'), heading: family('Newsreader', 'serif') },
}

export const presets = { zinc, moss, cobalt, iris, tide, plum } satisfies Record<string, Preset>

export type PresetName = keyof typeof presets

/** @deprecated Use `presets`. Presets now carry radius and weights as well as colours. */
export const colorPresets = presets
/** @deprecated Use `Preset`. */
export type ColorPreset = Preset
/** @deprecated Use `PresetName`. */
export type ColorPresetName = PresetName
