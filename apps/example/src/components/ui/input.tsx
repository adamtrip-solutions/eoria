import { forwardRef, useState } from 'react'
import { TextInput, type TextInputProps } from 'react-native'
import { useUnistyles } from 'react-native-unistyles'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'

export const inputRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** Filled field, same frame as the Select trigger. */
    root: {
      minHeight: 52,
      paddingHorizontal: theme.space[4],
      borderWidth: 1.5,
      borderColor: 'transparent',
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.muted,
      color: theme.colors.foreground,
      fontSize: theme.fontSize.md,
    },
  },
  variants: {
    size: {
      sm: {
        root: { minHeight: 44, fontSize: theme.fontSize.sm, paddingHorizontal: theme.space[3] },
      },
      md: {},
      lg: {
        root: { minHeight: 56, fontSize: theme.fontSize.lg, paddingHorizontal: theme.space[5] },
      },
    },
    focused: {
      true: { root: { borderColor: theme.colors.ring } },
      false: {},
    },
    invalid: {
      true: { root: { borderColor: theme.colors.destructive } },
      false: {},
    },
    disabled: {
      true: { root: { opacity: 0.5 } },
      false: {},
    },
  },
  defaultVariants: { size: 'md', focused: false, invalid: false, disabled: false },
}))

export type InputProps = Omit<TextInputProps, 'editable'> &
  Pick<RecipeVariants<typeof inputRecipe>, 'size'> & {
    invalid?: boolean
    disabled?: boolean
    styles?: SlotOverrides<never>
  }

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { size, invalid = false, disabled = false, styles, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const { theme } = useUnistyles()
  const s = useRecipe(inputRecipe, { size, focused, invalid, disabled }, styles)
  return (
    <TextInput
      ref={ref}
      style={[s.root, style]}
      editable={!disabled}
      placeholderTextColor={theme.colors.mutedForeground}
      selectionColor={theme.colors.primary}
      accessibilityState={{ disabled }}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      {...rest}
    />
  )
})
