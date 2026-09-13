import type { ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'
import { Text } from '@/components/ui/text'

/** Tinted chip by default (soft fill, strong text); `solid` for emphasis. */
export const badgeRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[1],
      paddingHorizontal: theme.space[2],
      paddingVertical: 3,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    label: {
      fontSize: theme.fontSize.xs,
      lineHeight: theme.lineHeight.xs,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
    },
  },
  variants: {
    variant: {
      default: {
        root: { backgroundColor: theme.colors.accent },
        label: { color: theme.colors.accentForeground },
      },
      solid: {
        root: { backgroundColor: theme.colors.primary },
        label: { color: theme.colors.primaryForeground },
      },
      secondary: {
        root: { backgroundColor: theme.colors.muted },
        label: { color: theme.colors.mutedForeground },
      },
      outline: { root: { borderColor: theme.colors.border } },
      destructive: {
        root: { backgroundColor: theme.colors.destructive },
        label: { color: theme.colors.destructiveForeground },
      },
    },
    size: {
      sm: {},
      md: {
        root: { paddingHorizontal: theme.space[3], paddingVertical: theme.space[1] },
        label: { fontSize: theme.fontSize.sm, lineHeight: theme.lineHeight.sm },
      },
    },
  },
  defaultVariants: { variant: 'default', size: 'sm' },
}))

export type BadgeProps = ViewProps &
  RecipeVariants<typeof badgeRecipe> & {
    children?: ReactNode
    styles?: SlotOverrides<'label'>
  }

export function Badge({ variant, size, styles, style, children, ...rest }: BadgeProps) {
  const s = useRecipe(badgeRecipe, { variant, size }, styles)
  const content =
    typeof children === 'string' || typeof children === 'number' ? (
      <Text style={s.label}>{children}</Text>
    ) : (
      children
    )
  return (
    <View style={[s.root, style]} {...rest}>
      {content}
    </View>
  )
}
