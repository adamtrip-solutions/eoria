import { useEffect } from 'react'
import { type ViewProps } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'

export const skeletonRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { backgroundColor: theme.colors.muted, borderRadius: theme.radius.md },
  },
  variants: {
    shape: {
      rect: {},
      circle: { root: { borderRadius: theme.radius.full } },
      text: { root: { height: theme.lineHeight.md - 4, borderRadius: theme.radius.sm } },
    },
  },
  defaultVariants: { shape: 'rect' },
}))

export type SkeletonProps = ViewProps &
  RecipeVariants<typeof skeletonRecipe> & {
    /** Pulse the opacity. Off automatically when the OS reduce-motion setting is on. */
    animated?: boolean
    styles?: SlotOverrides<never>
  }

/**
 * Loading placeholder. Hidden from assistive tech; announce loading state on
 * the container instead (for example `accessibilityState={{ busy: true }}`).
 */
export function Skeleton({ shape, animated = true, styles, style, ...rest }: SkeletonProps) {
  const s = useRecipe(skeletonRecipe, { shape }, styles)
  const reduceMotion = useReducedMotion()
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (!animated || reduceMotion) {
      cancelAnimation(opacity)
      opacity.value = 1
      return
    }
    opacity.value = withRepeat(
      withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
    return () => cancelAnimation(opacity)
  }, [animated, reduceMotion, opacity])

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[s.root, pulse, style]}
      {...rest}
    />
  )
}
