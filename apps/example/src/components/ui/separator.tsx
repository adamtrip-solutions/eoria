import { View, type ViewProps } from 'react-native'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'

export const separatorRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { backgroundColor: theme.colors.border },
  },
  variants: {
    orientation: {
      horizontal: { root: { height: 1, alignSelf: 'stretch' } },
      vertical: { root: { width: 1, alignSelf: 'stretch' } },
    },
  },
  defaultVariants: { orientation: 'horizontal' },
}))

export type SeparatorProps = ViewProps &
  RecipeVariants<typeof separatorRecipe> & {
    /** Purely visual. Hidden from assistive tech. Default true. */
    decorative?: boolean
    styles?: SlotOverrides<never>
  }

export function Separator({
  orientation,
  decorative = true,
  styles,
  style,
  ...rest
}: SeparatorProps) {
  const s = useRecipe(separatorRecipe, { orientation }, styles)
  return (
    <View
      role={decorative ? 'none' : 'separator'}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={[s.root, style]}
      {...rest}
    />
  )
}
