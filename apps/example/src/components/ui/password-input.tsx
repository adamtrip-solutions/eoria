import { forwardRef, useState, type ReactElement, type ReactNode } from 'react'
import type { TextInput } from 'react-native'
import { Eye, EyeOff } from 'lucide-react-native'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  type InputGroupInputProps,
  type InputGroupProps,
} from '@/components/ui/input-group'

export type PasswordInputProps = Omit<
  InputGroupInputProps,
  'secureTextEntry' | 'style' | 'children'
> &
  Pick<InputGroupProps, 'size' | 'invalid' | 'disabled' | 'styles' | 'style'> & {
    /** Whether the characters show. Leave it out and the toggle keeps its own state. */
    visible?: boolean
    defaultVisible?: boolean
    onVisibleChange?: (visible: boolean) => void
    /** Read out for the toggle while the password is hidden. */
    showLabel?: string
    /** Read out for the toggle while the password shows. */
    hideLabel?: string
    /** Toggle icon while the password is hidden. Any element accepting `size` and `color`. */
    showIcon?: ReactElement<{ size?: number; color?: string }>
    /** Toggle icon while the password shows. */
    hideIcon?: ReactElement<{ size?: number; color?: string }>
    /**
     * `InputGroupAddon` elements, such as a lock icon. They go into the group, which puts each
     * on its `align` edge. An `end` addon sits before the toggle.
     */
    children?: ReactNode
  }

/**
 * Secure field with a reveal toggle, built from the InputGroup parts. It has
 * no recipe of its own; `styles` and `style` go to the group, and children go
 * in as addons. The autofill
 * hints default to an existing password, so pass `autoComplete="new-password"`
 * and `textContentType="newPassword"` on a sign-up form.
 */
export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(function PasswordInput(
  {
    size,
    invalid,
    disabled,
    styles,
    style,
    visible: controlled,
    defaultVisible = false,
    onVisibleChange,
    showLabel = 'Show password',
    hideLabel = 'Hide password',
    showIcon = <Eye />,
    hideIcon = <EyeOff />,
    children,
    ...rest
  },
  ref,
) {
  const [uncontrolled, setUncontrolled] = useState(defaultVisible)
  const visible = controlled ?? uncontrolled
  const toggle = () => {
    if (controlled === undefined) setUncontrolled(!visible)
    onVisibleChange?.(!visible)
  }
  return (
    <InputGroup size={size} invalid={invalid} disabled={disabled} styles={styles} style={style}>
      <InputGroupInput
        ref={ref}
        secureTextEntry={!visible}
        textContentType="password"
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        {...rest}
      />
      {children}
      <InputGroupAddon align="end">
        {/* The icon and the label both name what a press does next. */}
        <InputGroupButton
          icon={visible ? hideIcon : showIcon}
          accessibilityLabel={visible ? hideLabel : showLabel}
          onPress={toggle}
        />
      </InputGroupAddon>
    </InputGroup>
  )
})
