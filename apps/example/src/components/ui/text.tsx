import { Platform, Text as RNText, type TextProps as RNTextProps } from 'react-native'
import {
  defineSlotRecipe,
  useRecipe,
  type EoriaTheme,
  type PlatformFont,
  type RecipeVariants,
  type SlotOverrides,
} from '@eoria/core'

const platform: keyof PlatformFont =
  Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : 'ios'

const systemFont: PlatformFont = { ios: 'System', android: 'sans-serif', web: 'system-ui' }

/**
 * `{ fontFamily }` for this platform. A theme without a family gets the system font by
 * name rather than no key at all: Unistyles keeps a key that disappears from a style, so
 * the family of the previous theme would stay after a live theme change.
 */
export const fontFamily = (font: PlatformFont | undefined) => ({
  fontFamily: (font ?? systemFont)[platform],
})

/** Body family of a theme, for text that does not render through `Text`, such as fields. */
export const bodyFont = (theme: EoriaTheme) => fontFamily(theme.font.body)

/** Heading family of a theme, for title slots outside `Text`. Falls back to the body family. */
export const headingFont = (theme: EoriaTheme) => fontFamily(theme.font.heading ?? theme.font.body)

export const textRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      color: theme.colors.foreground,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.normal,
      ...bodyFont(theme),
    },
  },
  variants: {
    variant: {
      body: {},
      muted: {
        root: {
          color: theme.colors.mutedForeground,
          fontSize: theme.fontSize.sm,
          lineHeight: theme.lineHeight.sm,
        },
      },
      caption: {
        root: {
          color: theme.colors.mutedForeground,
          fontSize: theme.fontSize.xs,
          lineHeight: theme.lineHeight.xs,
        },
      },
      label: {
        root: {
          fontSize: theme.fontSize.sm,
          lineHeight: theme.lineHeight.sm,
          fontWeight: theme.fontWeight.medium,
        },
      },
      title: {
        root: {
          fontSize: theme.fontSize.xl,
          lineHeight: theme.lineHeight.xl,
          fontWeight: theme.fontWeight.semibold,
          ...headingFont(theme),
        },
      },
      heading: {
        root: {
          fontSize: theme.fontSize['2xl'],
          lineHeight: theme.lineHeight['2xl'],
          fontWeight: theme.fontWeight.semibold,
          letterSpacing: -0.4,
          ...headingFont(theme),
        },
      },
    },
    weight: {
      normal: { root: { fontWeight: theme.fontWeight.normal } },
      medium: { root: { fontWeight: theme.fontWeight.medium } },
      semibold: { root: { fontWeight: theme.fontWeight.semibold } },
      bold: { root: { fontWeight: theme.fontWeight.bold } },
    },
  },
  defaultVariants: { variant: 'body' },
}))

export type TextVariants = RecipeVariants<typeof textRecipe>

export type TextProps = RNTextProps &
  TextVariants & {
    /** Per-slot style overrides, merged last. */
    styles?: SlotOverrides<never>
  }

/**
 * Themed text. Single-slot, so the plain `style` prop is also accepted and
 * merged after the recipe. Respects dynamic type with a capped multiplier.
 */
export function Text({
  variant,
  weight,
  styles,
  style,
  maxFontSizeMultiplier = 1.5,
  suppressHighlighting = true,
  ...rest
}: TextProps) {
  const s = useRecipe(textRecipe, { variant, weight }, styles)
  return (
    <RNText
      style={[s.root, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      // iOS draws a grey box behind pressable text unless this is set.
      suppressHighlighting={suppressHighlighting}
      {...rest}
    />
  )
}
