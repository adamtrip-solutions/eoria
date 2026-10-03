import { useEffect } from 'react'
import { Pressable, type PressableProps } from 'react-native'
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

export const switchRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      width: 51,
      height: 31,
      padding: 2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.input,
      justifyContent: 'center',
      opacity: 1,
    },
    thumb: {
      width: 27,
      height: 27,
      borderRadius: theme.radius.full,
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    rootDisabled: { opacity: 0.5 },
  },
  variants: {
    checked: {
      true: {
        root: { backgroundColor: theme.colors.primary },
        thumb: { backgroundColor: theme.colors.primaryForeground },
      },
      false: {},
    },
    size: {
      sm: { root: { width: 40, height: 24 }, thumb: { width: 20, height: 20 } },
      md: {},
    },
  },
  defaultVariants: { checked: false, size: 'md' },
}))

export type SwitchProps = Omit<PressableProps, 'style' | 'onPress' | 'children'> &
  Pick<RecipeVariants<typeof switchRecipe>, 'size'> & {
    /** `'mixed'` rests the thumb halfway, for a switch that stands for a partly on group. */
    checked: boolean | 'mixed'
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    styles?: SlotOverrides<'thumb' | 'rootDisabled'>
  }

const progressOf = (checked: boolean | 'mixed') => (checked === 'mixed' ? 0.5 : checked ? 1 : 0)

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  size,
  styles,
  hitSlop = 8,
  ...rest
}: SwitchProps) {
  const s = useRecipe(switchRecipe, { checked: checked === true, size }, styles)
  const travel =
    (getStyleValue(s.root, 'width') as number) -
    (getStyleValue(s.thumb, 'width') as number) -
    2 * (getStyleValue(s.root, 'padding') as number)

  const progress = useSharedValue(progressOf(checked))
  useEffect(() => {
    progress.value = withTiming(progressOf(checked), {
      duration: 120,
      easing: Easing.out(Easing.quad),
    })
  }, [checked, progress])

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * travel }],
  }))

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled: disabled === true }}
      disabled={disabled}
      hitSlop={hitSlop}
      // A mixed switch turns on.
      onPress={() => onCheckedChange?.(checked !== true)}
      style={[s.root, disabled && s.rootDisabled]}
      {...rest}
    >
      <Animated.View style={[s.thumb, thumbStyle]} />
    </Pressable>
  )
}
