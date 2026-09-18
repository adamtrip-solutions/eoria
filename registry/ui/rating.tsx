import { useCallback, useRef, useState } from 'react'
import {
  I18nManager,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue } from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
} from '@eoria/core'

/**
 * Star rating. Tap a star to set it or drag across the row to scrub. The stars
 * are SVG, and a clipped copy in the fill colour sits over each empty one, so
 * `value={3.7}` fills 70% of the fourth star.
 *
 * The drag is a gesture-handler Pan, as in slider.tsx. A clear vertical
 * movement fails it so a parent ScrollView still scrolls. The app needs a
 * `GestureHandlerRootView` at its root.
 */
export const ratingRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** The touch target. Stays 44pt tall whatever the star size. */
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: theme.space[1],
      minHeight: 44,
    },
    rootDisabled: { opacity: 0.5 },
    /** `width` is read as the star size, `color` as the fill. */
    star: { width: 28, height: 28, color: theme.colors.primary },
    /** `color` of the unfilled part. */
    starEmpty: { color: theme.colors.muted },
  },
  variants: {
    size: {
      sm: { root: { gap: 2 }, star: { width: 16, height: 16 } },
      md: {},
      lg: { star: { width: 36, height: 36 } },
    },
    /** A read-only row is no touch target, so it takes the height of its stars. */
    readOnly: {
      true: { root: { minHeight: 0 } },
      false: {},
    },
  },
  defaultVariants: { size: 'md', readOnly: false },
}))

export type RatingSlots = 'rootDisabled' | 'star' | 'starEmpty'

export type RatingProps = Omit<ViewProps, 'style'> &
  Pick<RecipeVariants<typeof ratingRecipe>, 'size'> & {
    /** Any fraction draws as a partial star. */
    value?: number
    defaultValue?: number
    onValueChange?: (value: number) => void
    /** Number of stars. Default 5. */
    max?: number
    /** Taps, drags and screen-reader steps move by half a star. */
    allowHalf?: boolean
    /** Display only. No gesture, and the role becomes `image`. */
    readOnly?: boolean
    disabled?: boolean
    styles?: SlotOverrides<RatingSlots>
    style?: StyleProp<ViewStyle>
  }

const clamp = (n: number, lo: number, hi: number) => {
  'worklet'
  return Math.min(hi, Math.max(lo, n))
}

/** Five points in a 24 box. A stroke of the same colour rounds the tips. */
const STAR =
  'M12 3.2L14.59 9.04L20.94 9.7L16.18 13.96L17.53 20.2L12 17L6.47 20.2L7.82 13.96L3.06 9.7L9.41 9.04Z'

function Shape({ size, color }: { size: number; color: string | undefined }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR} fill={color} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  )
}

export function Rating({
  value: controlled,
  defaultValue = 0,
  onValueChange,
  max = 5,
  allowHalf = false,
  readOnly = false,
  disabled = false,
  size,
  styles,
  style,
  onLayout,
  accessibilityLabel = 'Rating',
  ...rest
}: RatingProps) {
  const s = useRecipe(ratingRecipe, { size, readOnly }, styles)
  const starSize = (getStyleValue(s.star, 'width') as number | undefined) ?? 28
  const gap = (getStyleValue(s.root, 'gap') as number | undefined) ?? 0
  const fill = getStyleValue(s.star, 'color') as string | undefined
  const empty = getStyleValue(s.starEmpty, 'color') as string | undefined

  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = clamp(controlled ?? uncontrolled, 0, max)
  const step = allowHalf ? 0.5 : 1

  // Latest callbacks and value for handlers that run outside the render.
  const latest = useRef({ value, controlled, onValueChange })
  latest.current = { value, controlled, onValueChange }

  const set = useCallback((next: number) => {
    const l = latest.current
    if (next === l.value) return
    if (l.controlled === undefined) setUncontrolled(next)
    l.onValueChange?.(next)
  }, [])

  const rowWidth = useSharedValue(0)
  /** Last value sent to JS, so a drag inside one star reports once. */
  const sent = useSharedValue(-1)
  const rtl = I18nManager.isRTL

  // A touch anywhere in a star counts the whole star, or the half it is in.
  // Left of the first star is zero, which is how a drag clears the rating.
  const place = (x: number) => {
    'worklet'
    const along = rtl ? rowWidth.value - x : x
    const stars = along / (starSize + gap)
    return clamp(Math.ceil(stars / step) * step, 0, max)
  }

  const pan = Gesture.Pan()
    .enabled(!readOnly && !disabled)
    // Any horizontal intent activates; clear vertical intent lets a parent scroll.
    .activeOffsetX([-2, 2])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      sent.value = -1
    })
    .onUpdate((e) => {
      const next = place(e.x)
      if (next !== sent.value) {
        sent.value = next
        runOnJS(set)(next)
      }
    })
    .onFinalize((e, success) => {
      // A tap never activates the pan; treat a still finger as a press on that star.
      const still = Math.abs(e.translationX) < 4 && Math.abs(e.translationY) < 4
      if (!success && still) runOnJS(set)(place(e.x))
    })

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const delta = e.nativeEvent.actionName === 'increment' ? step : -step
    set(clamp(latest.current.value + delta, 0, max))
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    rowWidth.value = e.nativeEvent.layout.width
    onLayout?.(e)
  }

  const interactive = !readOnly
  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole={interactive ? 'adjustable' : 'image'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        accessibilityValue={{ text: `${value} of ${max}` }}
        accessibilityActions={
          interactive && !disabled ? [{ name: 'increment' }, { name: 'decrement' }] : undefined
        }
        onAccessibilityAction={onAccessibilityAction}
        onLayout={handleLayout}
        style={[s.root, disabled && s.rootDisabled, style]}
        {...rest}
      >
        {Array.from({ length: max }, (_, i) => {
          const part = clamp(value - i, 0, 1)
          return (
            <View key={i} pointerEvents="none" style={{ width: starSize, height: starSize }}>
              <Shape size={starSize} color={empty} />
              {part > 0 ? (
                // `start` keeps the fill growing from the leading edge in right-to-left layouts.
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    start: 0,
                    width: starSize * part,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ position: 'absolute', top: 0, start: 0 }}>
                    <Shape size={starSize} color={fill} />
                  </View>
                </View>
              ) : null}
            </View>
          )
        })}
      </View>
    </GestureDetector>
  )
}
