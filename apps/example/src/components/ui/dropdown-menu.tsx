import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityState,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import {
  Popper,
  PopperAnchor,
  PopperContent,
  withPressHandlers,
  type PopperContentProps,
  type PressChildProps,
} from '@/components/ui/popper'
import { Text, type TextProps } from '@/components/ui/text'

export const dropdownMenuRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      minWidth: 220,
      paddingVertical: theme.space[2],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
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
    itemDisabled: { opacity: 0.5 },
    itemLabel: {
      flex: 1,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.foreground,
    },
    itemLabelDestructive: { color: theme.colors.destructive },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 16, height: 16, color: theme.colors.mutedForeground },
    iconDestructive: { color: theme.colors.destructive },
    label: {
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2],
      fontSize: theme.fontSize.xs,
      lineHeight: theme.lineHeight.xs,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.mutedForeground,
    },
    separator: { height: 1, marginVertical: theme.space[1], backgroundColor: theme.colors.border },
  },
  variants: {},
  defaultVariants: {},
}))

type MenuSlots =
  | 'item'
  | 'itemPressed'
  | 'itemDisabled'
  | 'itemLabel'
  | 'itemLabelDestructive'
  | 'icon'
  | 'iconDestructive'
  | 'label'
  | 'separator'
type Ctx = { open: boolean; setOpen: (open: boolean) => void; styles: SlotStyles<MenuSlots> }
const MenuContext = createContext<Ctx | null>(null)

function useMenu(part: string) {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <DropdownMenu>`)
  return ctx
}

export type DropdownMenuProps = RecipeVariants<typeof dropdownMenuRecipe> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  styles?: SlotOverrides<MenuSlots>
  children?: ReactNode
}

export function DropdownMenu({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  styles,
  children,
}: DropdownMenuProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ?? uncontrolled
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )
  const s = useRecipe(dropdownMenuRecipe, {}, styles)
  return (
    <MenuContext.Provider value={{ open, setOpen, styles: s }}>
      <Popper>{children}</Popper>
    </MenuContext.Provider>
  )
}

export type DropdownMenuTriggerProps = Omit<PressableProps, 'children'> & {
  asChild?: boolean
  /** Style for the measured wrapper around the trigger, e.g. `{ alignSelf: 'stretch' }`. */
  anchorStyle?: StyleProp<ViewStyle>
  children: ReactElement<PressChildProps & { accessibilityState?: AccessibilityState }> | ReactNode
}

type TriggerChild = ReactElement<PressChildProps & { accessibilityState?: AccessibilityState }>

/** Wraps the trigger in the measured anchor. With `asChild`, injects `onPress` and `expanded` into the child. */
export function DropdownMenuTrigger({
  asChild,
  anchorStyle,
  children,
  ...rest
}: DropdownMenuTriggerProps) {
  const { open, setOpen } = useMenu('DropdownMenuTrigger')
  const toggle = () => setOpen(!open)
  return (
    <PopperAnchor style={anchorStyle}>
      {asChild && isValidElement<TriggerChild['props']>(children) ? (
        withPressHandlers(
          cloneElement(children, {
            accessibilityState: { ...children.props.accessibilityState, expanded: open },
          }),
          { onPress: toggle },
        )
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          {...rest}
        >
          {children}
        </Pressable>
      )}
    </PopperAnchor>
  )
}

export type DropdownMenuContentProps = Omit<PopperContentProps, 'onDismiss'>

export function DropdownMenuContent({
  align = 'start',
  style,
  children,
  ...rest
}: DropdownMenuContentProps) {
  const ctx = useMenu('DropdownMenuContent')
  const { open, setOpen, styles } = ctx
  const dismiss = useCallback(() => setOpen(false), [setOpen])
  if (!open) return null
  return (
    <PopperContent
      align={align}
      accessibilityRole="menu"
      onDismiss={dismiss}
      style={[styles.root, style]}
      {...rest}
    >
      <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>
    </PopperContent>
  )
}

export type DropdownMenuItemProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  children: ReactNode
  /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
  icon?: ReactElement<{ size?: number; color?: string }>
  destructive?: boolean
  /** Called on press. The menu closes afterwards unless `closeOnSelect` is false. */
  onSelect?: () => void
  closeOnSelect?: boolean
}

export function DropdownMenuItem({
  children,
  icon,
  destructive = false,
  disabled,
  onSelect,
  closeOnSelect = true,
  ...rest
}: DropdownMenuItemProps) {
  const { setOpen, styles } = useMenu('DropdownMenuItem')
  const iconStyle = destructive ? [styles.icon, styles.iconDestructive] : styles.icon
  const iconNode = isValidElement(icon)
    ? cloneElement(icon, {
        size: getStyleValue(iconStyle, 'width') as number | undefined,
        color: getStyleValue(iconStyle, 'color') as string | undefined,
      })
    : null
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={() => {
        onSelect?.()
        if (closeOnSelect) setOpen(false)
      }}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
        disabled && styles.itemDisabled,
      ]}
      {...rest}
    >
      {iconNode}
      {typeof children === 'string' ? (
        <Text style={[styles.itemLabel, destructive && styles.itemLabelDestructive]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}

export function DropdownMenuLabel({ style, ...rest }: TextProps) {
  return <Text style={[useMenu('DropdownMenuLabel').styles.label, style]} {...rest} />
}

export function DropdownMenuSeparator({ style, ...rest }: ViewProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[useMenu('DropdownMenuSeparator').styles.separator, style]}
      {...rest}
    />
  )
}
