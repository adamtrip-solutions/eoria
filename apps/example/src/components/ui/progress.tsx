import { useEffect, useState } from 'react'
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'

export const progressRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      height: 8,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.muted,
      overflow: 'hidden',
    },
    indicator: {
      height: '100%',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
  },
  variants: {
    size: {
      sm: { root: { height: 4 } },
      md: {},
      lg: { root: { height: 12 } },
    },
  },
  defaultVariants: { size: 'md' },
}))

export type ProgressProps = ViewProps &
  RecipeVariants<typeof progressRecipe> & {
    /** 0 to `max`. Clamped. */
    value: number
    max?: number
    styles?: SlotOverrides<'indicator'>
  }

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Determinate progress bar. Width animates with a short timing; reduce motion jumps. */
export function Progress({
  value,
  max = 100,
  size,
  styles,
  style,
  onLayout,
  accessibilityLabel,
  ...rest
}: ProgressProps) {
  const s = useRecipe(progressRecipe, { size }, styles)
  const [trackWidth, setTrackWidth] = useState(0)
  const fraction = max > 0 ? clamp(value, 0, max) / max : 0
  const width = useSharedValue(0)

  useEffect(() => {
    width.value = withTiming(trackWidth * fraction, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    })
  }, [trackWidth, fraction, width])

  const indicator = useAnimatedStyle(() => ({ width: width.value }))

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width)
    onLayout?.(e)
  }

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max, now: clamp(value, 0, max) }}
      onLayout={handleLayout}
      style={[s.root, style]}
      {...rest}
    >
      <Animated.View style={[s.indicator, indicator]} />
    </View>
  )
}
