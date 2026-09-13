import { useEffect } from 'react'
import { Pressable, type PressableProps } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'

export const checkboxRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: theme.colors.mutedForeground,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** Rotated L-shape drawn with borders, so no icon dependency. */
    check: {
      width: 6,
      height: 10,
      marginTop: -2,
      borderBottomWidth: 2,
      borderRightWidth: 2,
      borderColor: theme.colors.primaryForeground,
      transform: [{ rotate: '45deg' }],
    },
    rootPressed: { opacity: 0.8 },
    rootDisabled: { opacity: 0.5 },
  },
  variants: {
    checked: {
      true: { root: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } },
      false: {},
    },
    size: {
      sm: { root: { width: 20, height: 20, borderRadius: 6 }, check: { width: 5, height: 9 } },
      md: {},
      lg: { root: { width: 28, height: 28, borderRadius: 8 }, check: { width: 7, height: 13 } },
    },
  },
  defaultVariants: { checked: false, size: 'md' },
}))

export type CheckboxProps = Omit<PressableProps, 'style' | 'onPress' | 'children'> &
  Pick<RecipeVariants<typeof checkboxRecipe>, 'size'> & {
    checked: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    styles?: SlotOverrides<'check' | 'rootPressed' | 'rootDisabled'>
  }

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  size,
  styles,
  hitSlop = 8,
  ...rest
}: CheckboxProps) {
  const s = useRecipe(checkboxRecipe, { checked, size }, styles)
  const scale = useSharedValue(checked ? 1 : 0)

  useEffect(() => {
    scale.value = withTiming(checked ? 1 : 0, { duration: 120, easing: Easing.out(Easing.quad) })
  }, [checked, scale])

  const checkStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ rotate: '45deg' }, { scale: scale.value }],
  }))

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: disabled === true }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={() => onCheckedChange?.(!checked)}
      style={({ pressed }) => [s.root, pressed && s.rootPressed, disabled && s.rootDisabled]}
      {...rest}
    >
      <Animated.View style={[s.check, checkStyle]} />
    </Pressable>
  )
}
