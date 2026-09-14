import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type AccessibilityState,
  type PressableProps,
  type ScrollViewProps,
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
    /** The scrolling list inside `root`. Bound its height here. */
    list: { maxHeight: 360 },
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
    /** Title and description column. */
    itemBody: { flex: 1, paddingVertical: theme.space[3] },
    itemLabel: {
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.foreground,
    },
    itemLabelDestructive: { color: theme.colors.destructive },
    itemDescription: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      color: theme.colors.mutedForeground,
    },
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
  | 'list'
  | 'item'
  | 'itemPressed'
  | 'itemDisabled'
  | 'itemBody'
  | 'itemLabel'
  | 'itemLabelDestructive'
  | 'itemDescription'
  | 'icon'
  | 'iconDestructive'
  | 'label'
  | 'separator'
type Ctx = {
  open: boolean
  setOpen: (open: boolean) => void
  styles: SlotStyles<MenuSlots>
  /** True once any mounted item carries an icon; iconless items then reserve the gutter. */
  hasIcons: boolean
  registerIcon: () => () => void
}
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
  const [iconCount, setIconCount] = useState(0)
  const registerIcon = useCallback(() => {
    setIconCount((n) => n + 1)
    return () => setIconCount((n) => n - 1)
  }, [])
  return (
    <MenuContext.Provider
      value={{ open, setOpen, styles: s, hasIcons: iconCount > 0, registerIcon }}
    >
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

export type DropdownMenuContentProps = Omit<PopperContentProps, 'onDismiss'> & {
  scrollProps?: ScrollViewProps
}

export function DropdownMenuContent({
  align = 'start',
  scrollProps,
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
      <MenuContext.Provider value={ctx}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          style={styles.list}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </MenuContext.Provider>
    </PopperContent>
  )
}

export type DropdownMenuItemProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  /** The title. A string gets the label style; anything else renders as is. */
  children: ReactNode
  /** Secondary line under the title. */
  description?: string
  /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
  icon?: ReactElement<{ size?: number; color?: string }>
  destructive?: boolean
  /** Called on press. The menu closes afterwards unless `closeOnSelect` is false. */
  onSelect?: () => void
  closeOnSelect?: boolean
}

export function DropdownMenuItem({
  children,
  description,
  icon,
  destructive = false,
  disabled,
  onSelect,
  closeOnSelect = true,
  ...rest
}: DropdownMenuItemProps) {
  const { setOpen, styles, hasIcons, registerIcon } = useMenu('DropdownMenuItem')
  const iconStyle = destructive ? [styles.icon, styles.iconDestructive] : styles.icon
  const hasIcon = isValidElement(icon)
  const iconNode = hasIcon
    ? cloneElement(icon, {
        size: getStyleValue(iconStyle, 'width') as number | undefined,
        color: getStyleValue(iconStyle, 'color') as string | undefined,
      })
    : null
  // Runs before paint, so mixed menus align on first render.
  useLayoutEffect(() => (hasIcon ? registerIcon() : undefined), [hasIcon, registerIcon])
  const gutter = getStyleValue(iconStyle, 'width') as number | undefined
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
      {iconNode ?? (hasIcons ? <View style={{ width: gutter }} /> : null)}
      <View style={styles.itemBody}>
        {typeof children === 'string' ? (
          <Text style={[styles.itemLabel, destructive && styles.itemLabelDestructive]}>
            {children}
          </Text>
        ) : (
          children
        )}
        {description ? <Text style={styles.itemDescription}>{description}</Text> : null}
      </View>
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
