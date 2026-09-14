import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
} from '@eoria/core'
import { Text } from '@/components/ui/text'

/**
 * One-time code entry. A single invisible TextInput covers the row and owns
 * the value, so the keyboard, paste and autofill from SMS all work; the
 * cells only draw what it holds.
 */
export const inputOtpRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { flexDirection: 'row', gap: theme.space[2], alignSelf: 'flex-start' },
    cell: {
      flex: 1,
      minWidth: 44,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'transparent',
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.muted,
    },
    cellActive: { borderColor: theme.colors.ring },
    cellFilled: {},
    char: {
      fontSize: theme.fontSize['2xl'],
      lineHeight: theme.lineHeight['2xl'],
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
    },
    /** Blinking bar in the active cell. */
    caret: { width: 2, height: 24, borderRadius: 1, backgroundColor: theme.colors.primary },
    /** Dot shown instead of the character while `secure`. */
    mask: {
      width: 10,
      height: 10,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.foreground,
    },
  },
  variants: {
    size: {
      sm: {
        cell: { minWidth: 36, height: 44, borderRadius: theme.radius.sm },
        char: { fontSize: theme.fontSize.lg, lineHeight: theme.lineHeight.lg },
        caret: { height: 18 },
      },
      md: {},
      lg: {
        cell: { minWidth: 52, height: 64 },
        char: { fontSize: theme.fontSize['3xl'], lineHeight: theme.lineHeight['3xl'] },
        caret: { height: 28 },
      },
    },
    invalid: {
      true: { cell: { borderColor: theme.colors.destructive } },
      false: {},
    },
    disabled: {
      true: { root: { opacity: 0.5 } },
      false: {},
    },
  },
  defaultVariants: { size: 'md', invalid: false, disabled: false },
}))

export type InputOTPSlots = 'cell' | 'cellActive' | 'cellFilled' | 'char' | 'caret' | 'mask'

export type InputOTPProps = Omit<
  TextInputProps,
  | 'value'
  | 'defaultValue'
  | 'onChangeText'
  | 'maxLength'
  | 'style'
  | 'editable'
  | 'secureTextEntry'
  | 'multiline'
> &
  Pick<RecipeVariants<typeof inputOtpRecipe>, 'size'> & {
    /** Number of characters. Required. */
    length: number
    /** `numeric` accepts digits and opens the number pad. `alphanumeric` accepts letters and digits, upper-cased. */
    mode?: 'numeric' | 'alphanumeric'
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    /** Fires when the last character is entered. */
    onComplete?: (value: string) => void
    /** Draw a dot per character instead of the character. */
    secure?: boolean
    invalid?: boolean
    disabled?: boolean
    styles?: SlotOverrides<InputOTPSlots>
    style?: StyleProp<ViewStyle>
  }

const FILTER = { numeric: /[^0-9]/g, alphanumeric: /[^0-9a-zA-Z]/g }

function Caret({ style }: { style: StyleProp<ViewStyle> }) {
  const still = useReducedMotion()
  const opacity = useSharedValue(1)
  useEffect(() => {
    if (still) {
      cancelAnimation(opacity)
      opacity.value = 1
      return
    }
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 500 })),
      -1,
      false,
    )
    return () => cancelAnimation(opacity)
  }, [still, opacity])
  const blink = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View style={[style, blink]} />
}

export const InputOTP = forwardRef<TextInput, InputOTPProps>(function InputOTP(
  {
    length,
    mode = 'numeric',
    value: controlled,
    defaultValue = '',
    onValueChange,
    onComplete,
    secure = false,
    invalid = false,
    disabled = false,
    size,
    styles,
    style,
    onFocus,
    onBlur,
    accessibilityLabel = 'Verification code',
    autoFocus,
    ...rest
  },
  ref,
) {
  const s = useRecipe(inputOtpRecipe, { size, invalid, disabled }, styles)
  const inputRef = useRef<TextInput>(null)
  useImperativeHandle(ref, () => inputRef.current as TextInput)

  const sanitize = useCallback(
    (raw: string) => {
      const clean = raw.replace(FILTER[mode], '').slice(0, length)
      return mode === 'alphanumeric' ? clean.toUpperCase() : clean
    },
    [mode, length],
  )

  const [uncontrolled, setUncontrolled] = useState(() => sanitize(defaultValue))
  const value = sanitize(controlled ?? uncontrolled)
  const [focused, setFocused] = useState(false)
  const lastComplete = useRef<string | null>(null)

  const change = (raw: string) => {
    const next = sanitize(raw)
    // A rejected character leaves `value` unchanged, so React would not push
    // it back down; reset the native text by hand to keep the two in step.
    if (next !== raw && next === value) inputRef.current?.setNativeProps({ text: next })
    if (controlled === undefined) setUncontrolled(next)
    if (next !== value) onValueChange?.(next)
    if (next.length === length && lastComplete.current !== next) {
      lastComplete.current = next
      onComplete?.(next)
    }
    if (next.length < length) lastComplete.current = null
  }

  const activeIndex = focused && !disabled ? Math.min(value.length, length - 1) : -1
  const cells = Array.from({ length }, (_, i) => value[i] ?? '')

  return (
    <View style={[s.root, style]}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', flexGrow: 1, gap: getStyleValue(s.root, 'gap') ?? 8 }}
      >
        {cells.map((char, i) => (
          <View
            key={i}
            style={[s.cell, i === activeIndex && s.cellActive, char !== '' && s.cellFilled]}
          >
            {char === '' ? (
              i === activeIndex ? (
                <Caret style={s.caret} />
              ) : null
            ) : secure ? (
              <View style={s.mask} />
            ) : (
              <Text style={s.char}>{char}</Text>
            )}
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={change}
        editable={!disabled}
        autoFocus={autoFocus}
        caretHidden
        // Keep the invisible caret at the end so a tap never inserts mid-code.
        selection={{ start: value.length, end: value.length }}
        keyboardType={mode === 'numeric' ? 'number-pad' : 'default'}
        autoCapitalize={mode === 'alphanumeric' ? 'characters' : 'none'}
        autoCorrect={false}
        spellCheck={false}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={`${value.length} of ${length} characters entered`}
        accessibilityState={{ disabled }}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        style={[StyleSheet.absoluteFill, { opacity: 0, fontSize: 1, color: 'transparent' }]}
        {...rest}
      />
    </View>
  )
})
