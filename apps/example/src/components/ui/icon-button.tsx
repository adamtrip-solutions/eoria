import type { ReactElement } from 'react'
import { useUnistyles } from 'react-native-unistyles'
import { extendSlotRecipe } from '@eoria/core'
import {
  buttonRecipe,
  createButton,
  type ButtonBaseProps,
  type ButtonVariants,
} from '@/components/ui/button'

/**
 * Button recipe squared off into a circle. Each size is as tall as the Button
 * and Input of the same size, so an icon button lines up beside them in a row.
 * Variants, press feedback and the icon sizes come from the Button base.
 */
export const iconButtonRecipe = extendSlotRecipe(buttonRecipe, (theme) => ({
  slots: {
    root: { borderRadius: theme.radius.full },
  },
  variants: {
    size: {
      sm: { root: { minWidth: theme.control.sm, paddingHorizontal: 0 } },
      md: { root: { minWidth: theme.control.md, paddingHorizontal: 0 } },
      lg: { root: { minWidth: theme.control.lg, paddingHorizontal: 0 } },
    },
  },
}))

const RecipeIconButton = createButton(iconButtonRecipe)

/** Apple's minimum touch target, in points. */
const MIN_TARGET = 44

export type IconButtonProps = Omit<
  ButtonBaseProps,
  'children' | 'icon' | 'iconPosition' | 'accessibilityLabel'
> &
  Pick<ButtonVariants, 'variant'> & {
    size?: 'sm' | 'md' | 'lg'
    /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
    icon: ReactElement<{ size?: number; color?: string }>
    /** There is no visible text, so a screen reader has nothing else to read. */
    accessibilityLabel: string
  }

export function IconButton({ size = 'md', hitSlop, ...rest }: IconButtonProps) {
  const { theme } = useUnistyles()
  // Compact presets put `sm` under 44pt. The slop makes up the difference.
  const slop = Math.max(0, Math.ceil((MIN_TARGET - theme.control[size]) / 2))
  return <RecipeIconButton size={size} hitSlop={hitSlop ?? slop} {...rest} />
}
