import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PressableProps,
  type ScrollViewProps,
} from 'react-native'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import {
  Popper,
  PopperAnchor,
  PopperContent,
  type PopperContentProps,
} from '@/components/ui/popper'
import { Text, type TextProps } from '@/components/ui/text'

export const selectRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** Trigger. Mirrors the Input frame. */
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[2],
      minHeight: theme.control.md,
      paddingHorizontal: theme.space[4],
      borderWidth: 1.5,
      borderColor: theme.stroke ? theme.colors.input : 'transparent',
      borderRadius: theme.radius.control,
      backgroundColor: theme.colors.muted,
    },
    value: {
      flex: 1,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.foreground,
    },
    placeholder: { color: theme.colors.mutedForeground },
    /** Chevron drawn with two borders, rotated. */
    chevron: {
      width: 8,
      height: 8,
      marginTop: -4,
      borderRightWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: theme.colors.mutedForeground,
      transform: [{ rotate: '45deg' }],
    },
    content: {
      paddingVertical: theme.space[2],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: theme.shadow.opacity,
      shadowRadius: theme.shadow.radius,
      shadowOffset: { width: 0, height: theme.shadow.offset },
      elevation: 6,
    },
    /** The scrolling list inside `content`. Bound its height here. */
    list: { maxHeight: 320 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      minHeight: 50,
      paddingHorizontal: theme.space[4],
      marginHorizontal: theme.space[2],
      borderRadius: theme.radius.sm,
    },
    itemPressed: { backgroundColor: theme.colors.accent },
    itemSelected: { backgroundColor: theme.colors.accent },
    itemDisabled: { opacity: 0.5 },
    itemLabel: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      color: theme.colors.foreground,
    },
    /** Checkmark drawn with borders, visible on the selected item. */
    check: {
      width: 6,
      height: 10,
      marginTop: -3,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderColor: theme.colors.primary,
      transform: [{ rotate: '45deg' }],
    },
    label: {
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2],
      fontSize: theme.fontSize.xs,
      lineHeight: theme.lineHeight.xs,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.mutedForeground,
    },
  },
  variants: {
    size: {
      sm: { root: { minHeight: theme.control.sm }, value: { fontSize: theme.fontSize.sm } },
      md: {},
      lg: { root: { minHeight: theme.control.lg }, value: { fontSize: theme.fontSize.lg } },
    },
    open: {
      true: { root: { borderColor: theme.colors.ring } },
      false: {},
    },
    invalid: {
      true: { root: { borderColor: theme.colors.destructiveText } },
      false: {},
    },
    disabled: {
      true: { root: { opacity: 0.5 } },
      false: {},
    },
  },
  defaultVariants: { size: 'md', open: false, invalid: false, disabled: false },
}))

type SelectSlots =
  | 'value'
  | 'placeholder'
  | 'chevron'
  | 'content'
  | 'list'
  | 'item'
  | 'itemPressed'
  | 'itemSelected'
  | 'itemDisabled'
  | 'itemLabel'
  | 'check'
  | 'label'

/**
 * Options carry their label because items only mount while the list is
 * open, so the trigger could not otherwise show the selected label.
 */
export type SelectOption = { value: string; label: string }

type Ctx = {
  open: boolean
  setOpen: (open: boolean) => void
  value: SelectOption | undefined
  select: (option: SelectOption) => void
  disabled: boolean
  styles: SlotStyles<SelectSlots>
}
const SelectContext = createContext<Ctx | null>(null)

function useSelect(part: string) {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Select>`)
  return ctx
}

export type SelectProps = Pick<RecipeVariants<typeof selectRecipe>, 'size'> & {
  value?: SelectOption | undefined
  defaultValue?: SelectOption
  onValueChange?: (option: SelectOption) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  invalid?: boolean
  disabled?: boolean
  styles?: SlotOverrides<SelectSlots>
  children?: ReactNode
}

export function Select(props: SelectProps) {
  const {
    value: controlledValue,
    defaultValue,
    onValueChange,
    open: controlledOpen,
    onOpenChange,
    size,
    invalid = false,
    disabled = false,
    styles,
    children,
  } = props
  // Controlled when the `value` key is present, even if undefined (cleared).
  const isControlled = 'value' in props
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const value = isControlled ? controlledValue : uncontrolledValue
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [controlledOpen, onOpenChange],
  )
  const select = useCallback(
    (option: SelectOption) => {
      if (!isControlled) setUncontrolledValue(option)
      onValueChange?.(option)
      setOpen(false)
    },
    [isControlled, onValueChange, setOpen],
  )
  const s = useRecipe(selectRecipe, { size, open, invalid, disabled }, styles)
  return (
    <SelectContext.Provider value={{ open, setOpen, value, select, disabled, styles: s }}>
      <Popper>{children}</Popper>
    </SelectContext.Provider>
  )
}

export type SelectTriggerProps = Omit<PressableProps, 'style' | 'children'> & {
  placeholder?: string
  children?: ReactNode
}

/** Shows the selected label or the placeholder. Full width by default. */
export function SelectTrigger({ placeholder = 'Select…', children, ...rest }: SelectTriggerProps) {
  const { open, setOpen, value, disabled, styles } = useSelect('SelectTrigger')
  return (
    <PopperAnchor style={{ alignSelf: 'stretch' }}>
      <Pressable
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open, disabled }}
        accessibilityValue={value ? { text: value.label } : undefined}
        disabled={disabled}
        onPress={() => setOpen(!open)}
        style={styles.root}
        {...rest}
      >
        {children ?? (
          <Text numberOfLines={1} style={[styles.value, !value && styles.placeholder]}>
            {value ? value.label : placeholder}
          </Text>
        )}
        <View style={styles.chevron} />
      </Pressable>
    </PopperAnchor>
  )
}

export type SelectContentProps = Omit<PopperContentProps, 'onDismiss' | 'matchAnchorWidth'> & {
  scrollProps?: ScrollViewProps
}

export function SelectContent({
  align = 'start',
  scrollProps,
  style,
  children,
  ...rest
}: SelectContentProps) {
  const ctx = useSelect('SelectContent')
  const { open, setOpen, styles } = ctx
  const dismiss = useCallback(() => setOpen(false), [setOpen])
  if (!open) return null
  return (
    <PopperContent
      align={align}
      matchAnchorWidth
      onDismiss={dismiss}
      style={[styles.content, style]}
      {...rest}
    >
      <SelectContext.Provider value={ctx}>
        <ScrollView
          role="list"
          keyboardShouldPersistTaps="handled"
          bounces={false}
          style={styles.list}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </SelectContext.Provider>
    </PopperContent>
  )
}

export type SelectItemProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  value: string
  label: string
  children?: ReactNode
}

export function SelectItem({ value, label, disabled, children, ...rest }: SelectItemProps) {
  const { value: current, select, styles } = useSelect('SelectItem')
  const selected = current?.value === value
  return (
    <Pressable
      role="option"
      accessibilityState={{ selected, disabled: disabled === true }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => select({ value, label })}
      style={({ pressed }) => [
        styles.item,
        selected && styles.itemSelected,
        pressed && styles.itemPressed,
        disabled && styles.itemDisabled,
      ]}
      {...rest}
    >
      {children ?? <Text style={styles.itemLabel}>{label}</Text>}
      {selected ? <View style={styles.check} /> : null}
    </Pressable>
  )
}

export function SelectLabel({ style, ...rest }: TextProps) {
  return <Text style={[useSelect('SelectLabel').styles.label, style]} {...rest} />
}
