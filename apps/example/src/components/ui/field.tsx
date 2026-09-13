import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { AccessibilityInfo, View, type ViewProps } from 'react-native'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Label, type LabelProps } from '@/components/ui/label'
import { Text, type TextProps } from '@/components/ui/text'

export const fieldRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { gap: theme.space[2] },
    label: {},
    description: {
      color: theme.colors.mutedForeground,
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
    },
    error: {
      color: theme.colors.destructive,
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
    },
  },
  variants: {
    invalid: {
      true: { label: { color: theme.colors.destructive } },
      false: {},
    },
    disabled: {
      true: {},
      false: {},
    },
  },
  defaultVariants: { invalid: false, disabled: false },
}))

type FieldSlots = 'label' | 'description' | 'error'

/** Props a control receives from `<FieldControl>` or `useFieldControl()`. */
export type FieldControlProps = {
  nativeID: string
  accessibilityLabelledBy: string
  accessibilityLabel?: string
  accessibilityHint?: string
  invalid?: boolean
  disabled?: boolean
}

type Ctx = {
  styles: SlotStyles<FieldSlots>
  ids: { control: string; label: string; description: string; error: string }
  invalid: boolean
  disabled: boolean
  labelText: string | undefined
  setLabelText: (t: string | undefined) => void
  hintText: string | undefined
  setHintText: (t: string | undefined) => void
  errorText: string | undefined
  setErrorText: (t: string | undefined) => void
}
const FieldContext = createContext<Ctx | null>(null)

function useField(part: string) {
  const ctx = useContext(FieldContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Field>`)
  return ctx
}

export type FieldProps = ViewProps &
  RecipeVariants<typeof fieldRecipe> & {
    styles?: SlotOverrides<FieldSlots>
    children?: ReactNode
  }

/**
 * Groups a label, a control, and helper or error text, and wires the
 * accessibility links between them. `accessibilityLabelledBy` works on
 * Android only, so the label text is also passed as `accessibilityLabel`.
 */
export function Field({
  invalid = false,
  disabled = false,
  styles,
  style,
  children,
  ...rest
}: FieldProps) {
  const s = useRecipe(fieldRecipe, { invalid, disabled }, styles)
  const id = useId()
  const [labelText, setLabelText] = useState<string | undefined>()
  const [hintText, setHintText] = useState<string | undefined>()
  const [errorText, setErrorText] = useState<string | undefined>()
  const ids = {
    control: `${id}-control`,
    label: `${id}-label`,
    description: `${id}-description`,
    error: `${id}-error`,
  }
  return (
    <FieldContext.Provider
      value={{
        styles: s,
        ids,
        invalid,
        disabled,
        labelText,
        setLabelText,
        hintText,
        setHintText,
        errorText,
        setErrorText,
      }}
    >
      <View style={[s.root, style]} {...rest}>
        {children}
      </View>
    </FieldContext.Provider>
  )
}

/** Props to spread on a custom control inside a Field. */
export function useFieldControl(): FieldControlProps {
  const { ids, invalid, disabled, labelText, hintText, errorText } = useField('useFieldControl')
  const props: FieldControlProps = { nativeID: ids.control, accessibilityLabelledBy: ids.label }
  if (labelText !== undefined) props.accessibilityLabel = labelText
  // RN has no describedBy, so the error (or description) rides on the hint.
  const hint = invalid && errorText !== undefined ? errorText : hintText
  if (hint !== undefined) props.accessibilityHint = hint
  if (invalid) props.invalid = true
  if (disabled) props.disabled = true
  return props
}

export function FieldLabel({ children, style, ...rest }: LabelProps) {
  const { styles, ids, disabled, setLabelText } = useField('FieldLabel')
  const text = typeof children === 'string' ? children : undefined
  // Share the label text so the control can use it as its accessibilityLabel.
  useEffect(() => setLabelText(text), [text, setLabelText])
  return (
    <Label nativeID={ids.label} disabled={disabled} style={[styles.label, style]} {...rest}>
      {children}
    </Label>
  )
}

/** Injects the Field accessibility props into its single child. */
export function FieldControl({ children }: { children: ReactElement<Partial<FieldControlProps>> }) {
  const control = useFieldControl()
  const child = Children.only(children)
  if (!isValidElement(child)) return null
  return cloneElement(child, { ...control, ...child.props })
}

export function FieldDescription({ children, style, ...rest }: TextProps) {
  const { styles, ids, setHintText } = useField('FieldDescription')
  const text = typeof children === 'string' ? children : undefined
  useEffect(() => setHintText(text), [text, setHintText])
  return (
    <Text nativeID={ids.description} style={[styles.description, style]} {...rest}>
      {children}
    </Text>
  )
}

/**
 * Renders only while the Field is `invalid` and there is a message. Announces
 * the message when it appears; live regions alone do nothing on iOS.
 */
export function FieldError({ children, style, ...rest }: TextProps) {
  const { styles, ids, invalid, setErrorText } = useField('FieldError')
  const text = typeof children === 'string' ? children : undefined
  const shown = invalid && children !== null && children !== undefined && children !== false
  useEffect(() => setErrorText(text), [text, setErrorText])
  useEffect(() => {
    if (shown && text !== undefined) AccessibilityInfo.announceForAccessibility(text)
  }, [shown, text])
  if (!shown) return null
  return (
    <Text
      nativeID={ids.error}
      accessibilityLiveRegion="polite"
      style={[styles.error, style]}
      {...rest}
    >
      {children}
    </Text>
  )
}
