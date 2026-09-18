import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native'
import { useUnistyles } from 'react-native-unistyles'
import {
  extendSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { inputRecipe } from '@/components/ui/input'
import { Text, bodyFont } from '@/components/ui/text'

/**
 * Input recipe with the frame moved onto a row, so icons, text and buttons can
 * sit inside the field. Height, padding, border, corner, fill and the focus,
 * invalid and disabled states all come from the Input base. With no addons it
 * renders the same pixels as Input.
 */
export const inputGroupRecipe = extendSlotRecipe(inputRecipe, (theme) => ({
  slots: {
    root: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
    /** Frameless. `InputGroupInput` copies the text size and colour from `root`, which the Input base sets. */
    input: {
      flex: 1,
      alignSelf: 'stretch',
      paddingVertical: 0,
      paddingHorizontal: 0,
      ...bodyFont(theme),
    },
    addon: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
    addonText: {
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.mutedForeground,
    },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 20, height: 20, color: theme.colors.mutedForeground },
    /** Ghost pressable, shorter than the frame so the fill shows around it. */
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.space[1],
      height: theme.control.md - theme.space[4],
      minWidth: theme.control.md - theme.space[4],
      paddingHorizontal: theme.space[2],
      // Follows the frame's corner from the inside, down to the smallest step.
      borderRadius: Math.max(theme.radius.control - theme.space[2], theme.radius.sm),
      overflow: 'hidden',
    },
    /** A button inside an addon moves out toward that addon's edge of the frame. */
    buttonStart: { marginLeft: -theme.space[2] },
    buttonEnd: { marginRight: -theme.space[2] },
    /** Same tint layer as a ghost Button. */
    buttonPressed: { backgroundColor: theme.colors.foreground, opacity: 0.08 },
    buttonDisabled: { opacity: 0.4 },
    buttonLabel: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
    },
    buttonIcon: { width: 20, height: 20, color: theme.colors.mutedForeground },
  },
  variants: {
    size: {
      sm: {
        addonText: { fontSize: theme.fontSize.sm, lineHeight: theme.lineHeight.sm },
        icon: { width: 16, height: 16 },
        button: {
          height: theme.control.sm - theme.space[3],
          minWidth: theme.control.sm - theme.space[3],
        },
        buttonIcon: { width: 16, height: 16 },
      },
      lg: {
        addonText: { fontSize: theme.fontSize.lg, lineHeight: theme.lineHeight.lg },
        icon: { width: 22, height: 22 },
        button: {
          height: theme.control.lg - theme.space[4],
          minWidth: theme.control.lg - theme.space[4],
        },
        buttonIcon: { width: 22, height: 22 },
      },
    },
  },
}))

export type InputGroupSlots =
  | 'input'
  | 'addon'
  | 'addonText'
  | 'icon'
  | 'button'
  | 'buttonStart'
  | 'buttonEnd'
  | 'buttonPressed'
  | 'buttonDisabled'
  | 'buttonLabel'
  | 'buttonIcon'

/** Accessibility props a Field hands to its control. The group passes them on to the input. */
type ControlProps = Pick<
  TextInputProps,
  'nativeID' | 'accessibilityLabel' | 'accessibilityLabelledBy' | 'accessibilityHint'
>

type Ctx = {
  styles: SlotStyles<InputGroupSlots>
  disabled: boolean
  setFocused: (focused: boolean) => void
  inputRef: RefObject<TextInput | null>
  control: ControlProps
}
const InputGroupContext = createContext<Ctx | null>(null)
/** Which edge the surrounding addon sits on, for the buttons inside it. */
const AddonContext = createContext<'start' | 'end' | null>(null)

function useInputGroup(part: string) {
  const ctx = useContext(InputGroupContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <InputGroup>`)
  return ctx
}

export type InputGroupProps = ViewProps &
  Pick<RecipeVariants<typeof inputGroupRecipe>, 'size'> & {
    invalid?: boolean
    disabled?: boolean
    styles?: SlotOverrides<InputGroupSlots>
    children?: ReactNode
  }

const addonAlign = (child: ReactNode) =>
  isValidElement<InputGroupAddonProps>(child) && child.type === InputGroupAddon
    ? (child.props.align ?? 'start')
    : null

/**
 * The filled frame around an `InputGroupInput` and its addons. Addons go to
 * their `align` edge wherever they are written. A press anywhere on the frame
 * focuses the input. `nativeID`, `accessibilityLabel`, `accessibilityLabelledBy`
 * and `accessibilityHint` go to the input, not the frame, so the group works
 * as the single child of `FieldControl`.
 */
export function InputGroup({
  size,
  invalid = false,
  disabled = false,
  styles,
  style,
  children,
  nativeID,
  accessibilityLabel,
  accessibilityLabelledBy,
  accessibilityHint,
  ...rest
}: InputGroupProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<TextInput | null>(null)
  const s = useRecipe(inputGroupRecipe, { size, focused, invalid, disabled }, styles)
  const control: ControlProps = {}
  if (nativeID !== undefined) control.nativeID = nativeID
  if (accessibilityLabel !== undefined) control.accessibilityLabel = accessibilityLabel
  if (accessibilityLabelledBy !== undefined)
    control.accessibilityLabelledBy = accessibilityLabelledBy
  if (accessibilityHint !== undefined) control.accessibilityHint = accessibilityHint
  const parts = Children.toArray(children)
  return (
    <InputGroupContext.Provider value={{ styles: s, disabled, setFocused, inputRef, control }}>
      <Pressable
        // Only a touch target. Screen readers go straight to the input and the buttons.
        accessible={false}
        disabled={disabled}
        onPress={() => inputRef.current?.focus()}
        style={[s.root, style]}
        {...rest}
      >
        {parts.filter((child) => addonAlign(child) === 'start')}
        {parts.filter((child) => addonAlign(child) === null)}
        {parts.filter((child) => addonAlign(child) === 'end')}
      </Pressable>
    </InputGroupContext.Provider>
  )
}

export type InputGroupInputProps = Omit<TextInputProps, 'editable'>

/** A TextInput without a frame. Reports focus to the group, which draws the ring. */
export const InputGroupInput = forwardRef<TextInput, InputGroupInputProps>(function InputGroupInput(
  { style, onFocus, onBlur, ...rest },
  ref,
) {
  const { styles, disabled, setFocused, inputRef, control } = useInputGroup('InputGroupInput')
  const { theme } = useUnistyles()
  const setRef = useCallback(
    (node: TextInput | null) => {
      inputRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [inputRef, ref],
  )
  const text = {
    color: getStyleValue(styles.root, 'color'),
    fontSize: getStyleValue(styles.root, 'fontSize'),
  }
  return (
    <TextInput
      ref={setRef}
      style={[styles.input, text, style]}
      editable={!disabled}
      placeholderTextColor={theme.colors.mutedForeground}
      selectionColor={theme.colors.primary}
      accessibilityState={{ disabled }}
      {...control}
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

export type InputGroupAddonProps = ViewProps & {
  /** The edge it sits on, regardless of where it is written. Default `start`. */
  align?: 'start' | 'end'
  /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
  icon?: ReactElement<{ size?: number; color?: string }>
  /** A string gets the muted addon text style; anything else renders as is. */
  children?: ReactNode
}

export function InputGroupAddon({
  align = 'start',
  icon,
  style,
  children,
  ...rest
}: InputGroupAddonProps) {
  const { styles } = useInputGroup('InputGroupAddon')
  const iconNode = isValidElement(icon)
    ? cloneElement(icon, {
        size: getStyleValue(styles.icon, 'width') as number | undefined,
        color: getStyleValue(styles.icon, 'color') as string | undefined,
      })
    : null
  return (
    <AddonContext.Provider value={align}>
      <View style={[styles.addon, style]} {...rest}>
        {iconNode}
        {typeof children === 'string' || typeof children === 'number' ? (
          <Text style={styles.addonText}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </AddonContext.Provider>
  )
}

/** Apple's minimum touch target, in points. */
const MIN_TARGET = 44

/** With no visible text, the label is all a screen reader has, so the type asks for it. */
type ButtonLabel =
  | { children: ReactNode; accessibilityLabel?: string }
  | { children?: undefined; accessibilityLabel: string }

export type InputGroupButtonProps = Omit<
  PressableProps,
  'style' | 'children' | 'accessibilityLabel'
> &
  ButtonLabel & {
    /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
    icon?: ReactElement<{ size?: number; color?: string }>
  }

/** Small ghost button for an action inside the field, such as clear, reveal or paste. */
export function InputGroupButton({
  icon,
  children,
  disabled,
  accessibilityState,
  hitSlop,
  ...rest
}: InputGroupButtonProps) {
  const { styles, disabled: groupDisabled } = useInputGroup('InputGroupButton')
  const align = useContext(AddonContext)
  const off = disabled === true || groupDisabled
  const iconNode = isValidElement(icon)
    ? cloneElement(icon, {
        size: getStyleValue(styles.buttonIcon, 'width') as number | undefined,
        color: getStyleValue(styles.buttonIcon, 'color') as string | undefined,
      })
    : null
  // The button is smaller than a touch target on purpose. The slop makes up the difference.
  const height = (getStyleValue(styles.button, 'height') as number | undefined) ?? MIN_TARGET
  const slop = Math.max(0, Math.ceil((MIN_TARGET - height) / 2))
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={hitSlop ?? slop}
      {...rest}
      accessibilityState={{ ...accessibilityState, disabled: off }}
      disabled={off}
      style={[
        styles.button,
        align === 'start' && styles.buttonStart,
        align === 'end' && styles.buttonEnd,
        off && styles.buttonDisabled,
      ]}
    >
      {({ pressed }) => (
        <>
          {iconNode}
          {typeof children === 'string' || typeof children === 'number' ? (
            <Text style={styles.buttonLabel}>{children}</Text>
          ) : (
            children
          )}
          {pressed ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.buttonPressed]} />
          ) : null}
        </>
      )}
    </Pressable>
  )
}
