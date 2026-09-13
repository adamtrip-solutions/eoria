import { Text, type TextProps } from '@/components/ui/text'

export type LabelProps = Omit<TextProps, 'variant'> & {
  /** Dims the label and ignores presses, to match a disabled control. */
  disabled?: boolean
}

/**
 * Form label. `accessibilityLabelledBy` links label and control on Android
 * only, so also give the control an `accessibilityLabel` for iOS.
 */
export function Label({ disabled, style, onPress, ...rest }: LabelProps) {
  return (
    <Text
      variant="label"
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={disabled ? undefined : onPress}
      style={[disabled && { opacity: 0.5 }, style]}
      {...rest}
    />
  )
}
