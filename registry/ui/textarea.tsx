import { forwardRef, useState } from 'react'
import { TextInput, type TextInputProps } from 'react-native'
import { useUnistyles } from 'react-native-unistyles'
import { extendSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'
import { inputRecipe } from '@/components/ui/input'

/** Input recipe with multiline sizing. Edits to the Input base flow through. */
export const textareaRecipe = extendSlotRecipe(inputRecipe, (theme) => ({
  slots: {
    root: {
      minHeight: 96,
      paddingVertical: theme.space[3],
      textAlignVertical: 'top',
      lineHeight: theme.lineHeight.md,
    },
  },
  variants: {
    size: {
      sm: {
        root: { minHeight: 80, paddingVertical: theme.space[3], lineHeight: theme.lineHeight.sm },
      },
      lg: { root: { minHeight: 136, lineHeight: theme.lineHeight.lg } },
    },
  },
}))

export type TextareaProps = Omit<TextInputProps, 'editable' | 'multiline'> &
  Pick<RecipeVariants<typeof textareaRecipe>, 'size'> & {
    invalid?: boolean
    disabled?: boolean
    styles?: SlotOverrides<never>
  }

export const Textarea = forwardRef<TextInput, TextareaProps>(function Textarea(
  { size, invalid = false, disabled = false, styles, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const { theme } = useUnistyles()
  const s = useRecipe(textareaRecipe, { size, focused, invalid, disabled }, styles)
  return (
    <TextInput
      ref={ref}
      multiline
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
