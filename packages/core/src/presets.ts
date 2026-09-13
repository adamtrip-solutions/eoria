import type { EoriaColors } from './theme'

/**
 * Colour presets: a light and a dark palette for the fixed semantic keys.
 * `zinc` is the default. The others keep zinc's neutrals and change the
 * primary, ring and accent, the way shadcn base colours do.
 */
export type ColorPreset = { light: EoriaColors; dark: EoriaColors }

const zincLight: EoriaColors = {
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
}

const zincDark: EoriaColors = {
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
}

type Tint = {
  light: Pick<EoriaColors, 'primary' | 'primaryForeground' | 'ring' | 'accent' | 'accentForeground'>
  dark: Pick<EoriaColors, 'primary' | 'primaryForeground' | 'ring' | 'accent' | 'accentForeground'>
}

const tinted = (tint: Tint): ColorPreset => ({
  light: { ...zincLight, ...tint.light },
  dark: { ...zincDark, ...tint.dark },
})

export const colorPresets = {
  zinc: { light: zincLight, dark: zincDark },
  blue: tinted({
    light: {
      primary: '#2563eb',
      primaryForeground: '#f8fafc',
      ring: '#2563eb',
      accent: '#eff6ff',
      accentForeground: '#1e3a8a',
    },
    dark: {
      primary: '#3b82f6',
      primaryForeground: '#0a0a0a',
      ring: '#3b82f6',
      accent: '#1e293b',
      accentForeground: '#dbeafe',
    },
  }),
  green: tinted({
    light: {
      primary: '#15803d',
      primaryForeground: '#f0fdf4',
      ring: '#15803d',
      accent: '#f0fdf4',
      accentForeground: '#14532d',
    },
    dark: {
      primary: '#22c55e',
      primaryForeground: '#052e16',
      ring: '#22c55e',
      accent: '#1a2e22',
      accentForeground: '#dcfce7',
    },
  }),
  rose: tinted({
    light: {
      primary: '#be123c',
      primaryForeground: '#fff1f2',
      ring: '#be123c',
      accent: '#fff1f2',
      accentForeground: '#881337',
    },
    dark: {
      primary: '#f43f5e',
      primaryForeground: '#1c0208',
      ring: '#f43f5e',
      accent: '#2e1a1f',
      accentForeground: '#ffe4e6',
    },
  }),
  violet: tinted({
    light: {
      primary: '#7c3aed',
      primaryForeground: '#f5f3ff',
      ring: '#7c3aed',
      accent: '#f5f3ff',
      accentForeground: '#4c1d95',
    },
    dark: {
      primary: '#8b5cf6',
      primaryForeground: '#0f0a1f',
      ring: '#8b5cf6',
      accent: '#251c36',
      accentForeground: '#ede9fe',
    },
  }),
  orange: tinted({
    light: {
      primary: '#c2410c',
      primaryForeground: '#fff7ed',
      ring: '#c2410c',
      accent: '#fff7ed',
      accentForeground: '#7c2d12',
    },
    dark: {
      primary: '#f97316',
      primaryForeground: '#1c0a00',
      ring: '#f97316',
      accent: '#2e1f14',
      accentForeground: '#ffedd5',
    },
  }),
} satisfies Record<string, ColorPreset>

export type ColorPresetName = keyof typeof colorPresets
