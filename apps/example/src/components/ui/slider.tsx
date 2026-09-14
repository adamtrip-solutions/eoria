import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PanResponder,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native'
import Animated, {
  Easing,
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

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
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

  const snap = useCallback(
    (raw: number) => {
      const stepped = Math.round((raw - min) / step) * step + min
      const places = Math.max(decimals(step), decimals(min))
      return clamp(Number(stepped.toFixed(places)), min, max)
    },
    [min, max, step],
  )

  // Latest callbacks and value without re-creating the responder.
  const latest = useRef({ value, controlled, onValueChange, onValueCommit, snap, disabled })
  latest.current = { value, controlled, onValueChange, onValueCommit, snap, disabled }

  const trackRef = useRef<View>(null)
  /** Track width; the thumb travels exactly this far. */
  const [width, setWidth] = useState(0)
  const pageX = useRef(0)
  const measured = useRef(false)
  const dragging = useRef(false)

  const progress = useSharedValue(span > 0 ? (value - min) / span : 0)
  const active = useSharedValue(0)

  useEffect(() => {
    const next = span > 0 ? (value - min) / span : 0
    // Follow the finger directly; animate only programmatic changes.
    progress.value = dragging.current ? next : withTiming(next, MOVE)
  }, [value, min, span, progress])

  /** Snaps a track-relative x to a value and reports it as a change. */
  const changeFromX = useCallback(
    (x: number) => {
      const l = latest.current
      const w = Math.max(1, width)
      const next = l.snap(min + clamp(x / w, 0, 1) * span)
      if (next === l.value) return
      if (l.controlled === undefined) setUncontrolled(next)
      l.onValueChange?.(next)
    },
    [width, min, span],
  )

  const measureTrack = useCallback((then?: (x: number) => void) => {
    trackRef.current?.measureInWindow((x) => {
      pageX.current = x
      measured.current = true
      then?.(x)
    })
  }, [])

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.disabled,
        onMoveShouldSetPanResponder: () => !latest.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (_e, g) => {
          dragging.current = true
          active.value = withTiming(1, PRESS)
          // Re-measure on every grant: the slider may have scrolled since layout.
          measureTrack((x) => changeFromX(g.x0 - x))
        },
        onPanResponderMove: (_e, g) => {
          if (measured.current) changeFromX(g.moveX - pageX.current)
        },
        onPanResponderRelease: () => {
          dragging.current = false
          active.value = withTiming(0, PRESS)
          // The last change already snapped and stored the value; commit that.
          latest.current.onValueCommit?.(latest.current.value)
        },
        onPanResponderTerminate: () => {
          dragging.current = false
          active.value = withTiming(0, PRESS)
          latest.current.onValueCommit?.(latest.current.value)
        },
      }),
    [changeFromX, measureTrack, active],
  )

  const handleTrackLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width)
    measureTrack()
  }

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const l = latest.current
    const delta = e.nativeEvent.actionName === 'increment' ? step : -step
    const next = l.snap(l.value + delta)
    if (next === l.value) return
    if (l.controlled === undefined) setUncontrolled(next)
    l.onValueChange?.(next)
    l.onValueCommit?.(next)
  }

  const rangeStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }))
  // The track is inset by half a thumb on each side, so a thumb centred on
  // the track's start sits at `left: 0` of the root.
  const thumbStyle = useAnimatedStyle(() => ({
    left: progress.value * width,
    transform: [{ scale: 1 + active.value * 0.12 }],
  }))

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      onLayout={onLayout}
      style={[s.root, disabled && s.rootDisabled, style]}
      {...(disabled ? {} : responder.panHandlers)}
      {...rest}
    >
      <View
        ref={trackRef}
        collapsable={false}
        onLayout={handleTrackLayout}
        style={[s.track, { marginHorizontal: thumbSize / 2 }]}
      >
        <Animated.View style={[s.range, rangeStyle]} />
      </View>
      <Animated.View pointerEvents="none" style={[s.thumb, thumbStyle]} />
    </View>
  )
}
