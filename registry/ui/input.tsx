import { forwardRef, useState } from 'react'
import { TextInput, type TextInputProps } from 'react-native'
import { useUnistyles } from 'react-native-unistyles'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'
import { bodyFont } from '@/components/ui/text'

export const inputRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** Filled field, same frame as the Select trigger. */
    root: {
      minHeight: theme.control.md,
      paddingHorizontal: theme.space[4],
      borderWidth: 1.5,
      borderColor: theme.stroke ? theme.colors.input : 'transparent',
      borderRadius: theme.radius.control,
      backgroundColor: theme.colors.muted,
      color: theme.colors.foreground,
      fontSize: theme.fontSize.md,
      ...bodyFont(theme),
    },
  },
  variants: {
    size: {
      sm: {
        root: {
          minHeight: theme.control.sm,
          fontSize: theme.fontSize.sm,
          paddingHorizontal: theme.space[3],
        },
      },
      md: {},
      lg: {
        root: {
          minHeight: theme.control.lg,
          fontSize: theme.fontSize.lg,
          paddingHorizontal: theme.space[5],
        },
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
