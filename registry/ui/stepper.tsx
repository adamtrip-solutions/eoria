import { useCallback, useEffect, useRef, useState } from 'react'
import {
  I18nManager,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
} from '@eoria/core'
import { Text } from '@/components/ui/text'

/**
 * Number input as minus, value, plus, for quantities and small counts. One
 * muted capsule holds the three parts. The glyphs are drawn with bars, so the
 * file needs no icon package.
 */
export const stepperRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderRadius: theme.radius.control,
      backgroundColor: theme.colors.muted,
      overflow: 'hidden',
    },
    rootDisabled: { opacity: 0.5 },
    /** Square, as wide as the control is tall. */
    button: { alignItems: 'center', justifyContent: 'center' },
    /** Own View layered over the fill while pressed. */
    buttonPressed: { backgroundColor: theme.colors.foreground, opacity: 0.08 },
    /** Dims the glyph of a button that sits at its bound. */
    buttonDisabled: { opacity: 0.3 },
    /** One bar. Plus is two of them, the second turned a quarter. */
    glyph: {
      width: 14,
      height: 2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.foreground,
    },
    value: {
      minWidth: 36,
      textAlign: 'center',
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
      // Digits share one width, so the buttons do not shift as the value changes.
      fontVariant: ['tabular-nums'],
    },
  },
  variants: {
    size: {
      sm: {
        button: { width: theme.control.sm, height: theme.control.sm },
        glyph: { width: 12 },
        value: { minWidth: 28, fontSize: theme.fontSize.sm, lineHeight: theme.lineHeight.sm },
      },
      md: { button: { width: theme.control.md, height: theme.control.md } },
    },
  },
  defaultVariants: { size: 'md' },
}))

export type StepperSlots =
  'rootDisabled' | 'button' | 'buttonPressed' | 'buttonDisabled' | 'glyph' | 'value'

export type StepperProps = Omit<ViewProps, 'style'> &
  RecipeVariants<typeof stepperRecipe> & {
    value?: number
    defaultValue?: number
    /** Defaults follow UIStepper: 0 to 100 in steps of 1. */
    min?: number
    max?: number
    step?: number
    onValueChange?: (value: number) => void
    /** Text shown for the value and read by screen readers, e.g. `(n) => `${n} kg``. */
    formatValue?: (value: number) => string
    disabled?: boolean
    styles?: SlotOverrides<StepperSlots>
    style?: StyleProp<ViewStyle>
  }

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const decimals = (n: number) => {
  const s = String(n)
  const i = s.indexOf('.')
  return i === -1 ? 0 : s.length - i - 1
}

/** A hold starts repeating after this long, then speeds up to the floor. */
const HOLD_DELAY = 400
const REPEAT_START = 160
const REPEAT_FLOOR = 40
const REPEAT_ACCELERATION = 0.85

export function Stepper({
  value: controlled,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  formatValue = String,
  disabled = false,
  size,
  styles,
  style,
  accessibilityLabel,
  ...rest
}: StepperProps) {
  const s = useRecipe(stepperRecipe, { size }, styles)
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? min)
  const value = clamp(controlled ?? uncontrolled, min, max)
  const places = Math.max(decimals(step), decimals(min))

  // Latest props for the repeat timer, which outlives the render. `value` moves
  // ahead of React during a hold so two fast ticks never read the same number.
  const latest = useRef({ value, controlled, onValueChange })
  latest.current = { value, controlled, onValueChange }

  const stepBy = useCallback(
    (direction: 1 | -1) => {
      const l = latest.current
      const next = clamp(Number((l.value + direction * step).toFixed(places)), min, max)
      if (next === l.value) return false
      l.value = next
      if (l.controlled === undefined) setUncontrolled(next)
      l.onValueChange?.(next)
      return true
    },
    [min, max, step, places],
  )

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  const repeat = (direction: 1 | -1) => {
    let interval = REPEAT_START
    const tick = () => {
      // Stops by itself at a bound.
      if (!stepBy(direction)) return stop()
      interval = Math.max(REPEAT_FLOOR, interval * REPEAT_ACCELERATION)
      timer.current = setTimeout(tick, interval)
    }
    stop()
    tick()
  }
  useEffect(() => stop, [stop])
  useEffect(() => {
    if (disabled) stop()
  }, [disabled, stop])

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') stepBy(1)
    if (e.nativeEvent.actionName === 'decrement') stepBy(-1)
  }

  // Dense presets have controls under 44pt; the slop makes up the difference.
  const height = (getStyleValue(s.button, 'height') as number | undefined) ?? 44
  const slop = Math.max(0, (44 - height) / 2)

  const button = (direction: 1 | -1) => {
    const atBound = direction === 1 ? value >= max : value <= min
    return (
      <Pressable
        disabled={disabled || atBound}
        // Outwards only, so the two targets never overlap the value.
        hitSlop={{
          top: slop,
          bottom: slop,
          left: (direction === -1) !== I18nManager.isRTL ? slop : 0,
          right: (direction === 1) !== I18nManager.isRTL ? slop : 0,
        }}
        delayLongPress={HOLD_DELAY}
        onPress={() => stepBy(direction)}
        onLongPress={() => repeat(direction)}
        onPressOut={stop}
        style={s.button}
      >
        {({ pressed }) => (
          <>
            <View style={[s.glyph, atBound && s.buttonDisabled]} />
            {direction === 1 ? (
              <View
                style={[
                  s.glyph,
                  { position: 'absolute', transform: [{ rotate: '90deg' }] },
                  atBound && s.buttonDisabled,
                ]}
              />
            ) : null}
            {pressed ? (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.buttonPressed]} />
            ) : null}
          </>
        )}
      </Pressable>
    )
  }

  return (
    // One adjustable element for screen readers. The buttons are for touch.
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      accessibilityValue={{ text: formatValue(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      style={[s.root, disabled && s.rootDisabled, style]}
      {...rest}
    >
      {button(-1)}
      <Text numberOfLines={1} style={s.value}>
        {formatValue(value)}
      </Text>
      {button(1)}
    </View>
  )
}
