import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
} from '@eoria/core'

/**
 * Single-thumb slider in the iOS idiom: thin track, filled range, a white
 * thumb with a soft shadow. The root is the touch target and stays 44pt tall
 * whatever the track height.
 *
 * The drag is a gesture-handler Pan recognised natively, so it wins against
 * the stack's swipe-back (full-screen by default on iOS 26) and against a
 * vertical parent ScrollView once it activates. The thumb moves on the UI
 * thread; the app needs a `GestureHandlerRootView` at its root.
 */
export const sliderRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { minHeight: 44, justifyContent: 'center', alignSelf: 'stretch' },
    track: {
      height: 4,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.muted,
      overflow: 'hidden',
    },
    range: { height: '100%', backgroundColor: theme.colors.primary },
    /** `width` is read as the thumb diameter. */
    thumb: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderRadius: theme.radius.full,
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    rootDisabled: { opacity: 0.5 },
  },
  variants: {
    size: {
      sm: { track: { height: 3 }, thumb: { width: 20, height: 20 } },
      md: {},
      lg: { track: { height: 6 }, thumb: { width: 32, height: 32 } },
    },
  },
  defaultVariants: { size: 'md' },
}))

export type SliderSlots = 'track' | 'range' | 'thumb' | 'rootDisabled'

export type SliderProps = Omit<ViewProps, 'style'> &
  RecipeVariants<typeof sliderRecipe> & {
    value?: number
    defaultValue?: number
    min?: number
    max?: number
    /** Snap increment. Also the amount screen-reader increment/decrement moves. */
    step?: number
    /** Fires on every change while dragging. */
    onValueChange?: (value: number) => void
    /** Fires once when the finger lifts. */
    onValueCommit?: (value: number) => void
    disabled?: boolean
    styles?: SlotOverrides<SliderSlots>
    style?: StyleProp<ViewStyle>
  }

const clamp = (n: number, lo: number, hi: number) => {
  'worklet'
  return Math.min(hi, Math.max(lo, n))
}
const decimals = (n: number) => {
  const s = String(n)
  const i = s.indexOf('.')
  return i === -1 ? 0 : s.length - i - 1
}

const MOVE = { duration: 120, easing: Easing.out(Easing.quad) }
const PRESS = { duration: 90, easing: Easing.out(Easing.quad) }

export function Slider({
  value: controlled,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  onValueCommit,
  disabled = false,
  size,
  styles,
  style,
  onLayout,
  accessibilityLabel,
  ...rest
}: SliderProps) {
  const s = useRecipe(sliderRecipe, { size }, styles)
  const thumbSize = (getStyleValue(s.thumb, 'width') as number | undefined) ?? 28
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? min)
  const value = clamp(controlled ?? uncontrolled, min, max)
  const span = max - min
  const places = Math.max(decimals(step), decimals(min))

  const snap = useCallback(
    (raw: number) => {
      const stepped = Math.round((raw - min) / step) * step + min
      return clamp(Number(stepped.toFixed(places)), min, max)
    },
    [min, max, step, places],
  )

  // Latest callbacks and value for handlers that run outside the render.
  const latest = useRef({ value, controlled, onValueChange, onValueCommit, snap })
  latest.current = { value, controlled, onValueChange, onValueCommit, snap }

  const trackWidth = useSharedValue(0)
  const progress = useSharedValue(span > 0 ? (value - min) / span : 0)
  const active = useSharedValue(0)
  /** Where in the thumb the finger landed, so a grab does not jump. */
  const grab = useSharedValue(0)
  const dragging = useRef(false)

  // Follow programmatic changes; a drag already moved the thumb itself.
  useEffect(() => {
    if (dragging.current) return
    progress.value = withTiming(span > 0 ? (value - min) / span : 0, MOVE)
  }, [value, min, span, progress])

  const report = useCallback(
    (fraction: number, kind: 'change' | 'commit') => {
      const l = latest.current
      const next = l.snap(min + fraction * span)
      if (kind === 'commit') {
        dragging.current = false
        l.onValueCommit?.(next)
        return
      }
      if (next === l.value) return
      if (l.controlled === undefined) setUncontrolled(next)
      l.onValueChange?.(next)
    },
    [min, span],
  )
  const setDragging = useCallback((on: boolean) => {
    dragging.current = on
  }, [])

  // Step fraction on the UI thread so the thumb never sits between values.
  const steps = span > 0 ? span / step : 0
  const place = (x: number) => {
    'worklet'
    const w = trackWidth.value
    if (w <= 0) return progress.value
    const fraction = clamp((x - thumbSize / 2) / w, 0, 1)
    return steps > 0 ? Math.round(fraction * steps) / steps : fraction
  }

  const pan = Gesture.Pan()
    .enabled(!disabled)
    // Any horizontal intent activates; clear vertical intent lets a parent scroll.
    .activeOffsetX([-2, 2])
    .failOffsetY([-10, 10])
    .onBegin((e) => {
      active.value = withTiming(1, PRESS)
      runOnJS(setDragging)(true)
      const thumbX = thumbSize / 2 + progress.value * trackWidth.value
      // Grab the thumb where it is; anywhere else jumps to the finger.
      grab.value = Math.abs(e.x - thumbX) <= thumbSize / 2 ? e.x - thumbX : 0
    })
    .onUpdate((e) => {
      const next = place(e.x - grab.value)
      if (next !== progress.value) {
        progress.value = next
        runOnJS(report)(next, 'change')
      }
    })
    .onFinalize((e, success) => {
      active.value = withTiming(0, PRESS)
      // A tap never activates the pan; treat a still finger as a jump to it.
      // A pan that failed because it moved vertically is a scroll, not a tap.
      const still = Math.abs(e.translationX) < 4 && Math.abs(e.translationY) < 4
      if (!success && still && grab.value === 0) {
        const next = place(e.x)
        progress.value = withTiming(next, MOVE)
        runOnJS(report)(next, 'change')
      }
      runOnJS(report)(progress.value, 'commit')
    })

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const l = latest.current
    const delta = e.nativeEvent.actionName === 'increment' ? step : -step
    const next = l.snap(l.value + delta)
    if (next === l.value) return
    if (l.controlled === undefined) setUncontrolled(next)
    l.onValueChange?.(next)
    l.onValueCommit?.(next)
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = Math.max(0, e.nativeEvent.layout.width - thumbSize)
    onLayout?.(e)
  }

  const rangeStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }))
  const thumbStyle = useAnimatedStyle(() => ({
    left: progress.value * trackWidth.value,
    transform: [{ scale: 1 + active.value * 0.12 }],
  }))

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        onLayout={handleLayout}
        style={[s.root, disabled && s.rootDisabled, style]}
        {...rest}
      >
        <View pointerEvents="none" style={[s.track, { marginHorizontal: thumbSize / 2 }]}>
          <Animated.View style={[s.range, rangeStyle]} />
        </View>
        <Animated.View pointerEvents="none" style={[s.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  )
}
