import { useEffect } from 'react'
import { View, type ViewProps } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
} from '@eoria/core'

/**
 * Indeterminate loading indicator. `ring` is an SVG arc that rotates, `dots`
 * fade in sequence, `bars` pulse in height. The `indicator` slot carries the
 * size (`width`) and colour (`color`) every variant reads.
 */
export const spinnerRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { alignItems: 'center', justifyContent: 'center' },
    /** `width` is the overall size; `color` is the stroke or fill. */
    indicator: { width: 24, height: 24, color: theme.colors.primary },
  },
  variants: {
    variant: {
      ring: {},
      dots: {},
      bars: {},
    },
    size: {
      sm: { indicator: { width: 16, height: 16 } },
      md: {},
      lg: { indicator: { width: 32, height: 32 } },
    },
  },
  defaultVariants: { variant: 'ring', size: 'md' },
}))

export type SpinnerProps = ViewProps &
  RecipeVariants<typeof spinnerRecipe> & {
    /** Overrides the recipe colour, e.g. `primaryForeground` inside a filled button. */
    color?: string
    styles?: SlotOverrides<'indicator'>
  }

const CYCLE = 900
const LINEAR = { duration: CYCLE, easing: Easing.linear }
const EASE = Easing.inOut(Easing.quad)

function Ring({ size, color, still }: { size: number; color: string; still: boolean }) {
  const rotation = useSharedValue(0)
  useEffect(() => {
    if (still) {
      cancelAnimation(rotation)
      rotation.value = 0
      return
    }
    rotation.value = withRepeat(withTiming(360, LINEAR), -1, false)
    return () => cancelAnimation(rotation)
  }, [still, rotation])
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }))
  const stroke = Math.max(2, Math.round(size / 8))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <Animated.View style={[{ width: size, height: size }, spin]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeOpacity={0.2}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.28} ${circumference}`}
          fill="none"
        />
      </Svg>
    </Animated.View>
  )
}

function Pulse({
  index,
  still,
  style,
  mode,
}: {
  index: number
  still: boolean
  style: { width: number; height: number; borderRadius: number; backgroundColor: string }
  mode: 'opacity' | 'scaleY'
}) {
  const t = useSharedValue(1)
  useEffect(() => {
    if (still) {
      cancelAnimation(t)
      t.value = 1
      return
    }
    const low = mode === 'opacity' ? 0.25 : 0.4
    t.value = withDelay(
      index * (CYCLE / 6),
      withRepeat(
        withSequence(
          withTiming(low, { duration: CYCLE / 2, easing: EASE }),
          withTiming(1, { duration: CYCLE / 2, easing: EASE }),
        ),
        -1,
        false,
      ),
    )
    return () => cancelAnimation(t)
  }, [still, index, mode, t])
  const animated = useAnimatedStyle(() =>
    mode === 'opacity' ? { opacity: t.value } : { transform: [{ scaleY: t.value }] },
  )
  return <Animated.View style={[style, animated]} />
}

/**
 * Reports itself as a busy `progressbar`. Under the OS reduce-motion setting
 * the shapes stay put; the label still tells assistive tech what is happening.
 */
export function Spinner({
  variant = 'ring',
  size,
  color,
  styles,
  style,
  accessibilityLabel = 'Loading',
  ...rest
}: SpinnerProps) {
  const s = useRecipe(spinnerRecipe, { variant, size }, styles)
  const still = useReducedMotion()
  const px = (getStyleValue(s.indicator, 'width') as number | undefined) ?? 24
  const tint = color ?? (getStyleValue(s.indicator, 'color') as string | undefined) ?? '#000'

  let body
  if (variant === 'ring') {
    body = <Ring size={px} color={tint} still={still} />
  } else if (variant === 'dots') {
    const dot = Math.max(4, Math.round(px / 4))
    body = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: dot / 2, height: px }}>
        {[0, 1, 2].map((i) => (
          <Pulse
            key={i}
            index={i}
            still={still}
            mode="opacity"
            style={{ width: dot, height: dot, borderRadius: dot, backgroundColor: tint }}
          />
        ))}
      </View>
    )
  } else {
    const bar = Math.max(3, Math.round(px / 6))
    body = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: bar, height: px }}>
        {[0, 1, 2].map((i) => (
          <Pulse
            key={i}
            index={i}
            still={still}
            mode="scaleY"
            style={{ width: bar, height: px, borderRadius: bar, backgroundColor: tint }}
          />
        ))}
      </View>
    )
  }

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessibilityLabel={accessibilityLabel}
      style={[s.root, style]}
      {...rest}
    >
      {body}
    </View>
  )
}
