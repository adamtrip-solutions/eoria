import { Text as RNText, type TextProps as RNTextProps } from 'react-native'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'

export const textRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      color: theme.colors.foreground,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.normal,
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
        },
      },
      heading: {
        root: {
          fontSize: theme.fontSize['2xl'],
          lineHeight: theme.lineHeight['2xl'],
          fontWeight: theme.fontWeight.semibold,
          letterSpacing: -0.4,
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
