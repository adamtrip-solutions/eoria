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
  type AccessibilityState,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
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
  withPressHandlers,
  type PopperContentProps,
  type PressChildProps,
} from '@/components/ui/popper'
import { Text, headingFont, type TextProps } from '@/components/ui/text'

export const popoverRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      width: 300,
      padding: theme.space[5],
      gap: theme.space[3],
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: theme.shadow.opacity,
      shadowRadius: theme.shadow.radius,
      shadowOffset: { width: 0, height: theme.shadow.offset },
      elevation: 6,
    },
    title: {
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.semibold,
      ...headingFont(theme),
    },
    description: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      color: theme.colors.mutedForeground,
    },
  },
  variants: {},
  defaultVariants: {},
}))

type PopoverSlots = 'title' | 'description'
type Ctx = { open: boolean; setOpen: (open: boolean) => void; styles: SlotStyles<PopoverSlots> }
const PopoverContext = createContext<Ctx | null>(null)

function usePopover(part: string) {
  const ctx = useContext(PopoverContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Popover>`)
  return ctx
}

export type PopoverProps = RecipeVariants<typeof popoverRecipe> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  styles?: SlotOverrides<PopoverSlots>
  children?: ReactNode
}

export function Popover({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  styles,
  children,
}: PopoverProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ?? uncontrolled
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )
  const s = useRecipe(popoverRecipe, {}, styles)
  return (
    <PopoverContext.Provider value={{ open, setOpen, styles: s }}>
      <Popper>{children}</Popper>
    </PopoverContext.Provider>
  )
}

export type PopoverTriggerProps = Omit<PressableProps, 'children'> & {
  asChild?: boolean
  /** Style for the measured wrapper around the trigger, e.g. `{ alignSelf: 'stretch' }`. */
  anchorStyle?: StyleProp<ViewStyle>
  children: ReactElement<PressChildProps & { accessibilityState?: AccessibilityState }> | ReactNode
}

type TriggerChild = ReactElement<PressChildProps & { accessibilityState?: AccessibilityState }>

/** Wraps the trigger in the measured anchor. With `asChild`, injects `onPress` and `expanded` into the child. */
export function PopoverTrigger({ asChild, anchorStyle, children, ...rest }: PopoverTriggerProps) {
  const { open, setOpen } = usePopover('PopoverTrigger')
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

export type PopoverContentProps = Omit<PopperContentProps, 'onDismiss'> & {
  /** Tap outside or Android back closes it. Default true. */
  dismissable?: boolean
}

export function PopoverContent({
  dismissable = true,
  style,
  children,
  ...rest
}: PopoverContentProps) {
  const ctx = usePopover('PopoverContent')
  const { open, setOpen, styles } = ctx
  const dismiss = useCallback(() => setOpen(false), [setOpen])
  if (!open) return null
  return (
    <PopperContent
      onDismiss={dismissable ? dismiss : undefined}
      style={[styles.root, style]}
      {...rest}
    >
      <PopoverContext.Provider value={ctx}>{children}</PopoverContext.Provider>
    </PopperContent>
  )
}

export function PopoverTitle({ style, ...rest }: TextProps) {
  return (
    <Text
      accessibilityRole="header"
      style={[usePopover('PopoverTitle').styles.title, style]}
      {...rest}
    />
  )
}

export function PopoverDescription({ style, ...rest }: TextProps) {
  return <Text style={[usePopover('PopoverDescription').styles.description, style]} {...rest} />
}

export function PopoverClose({ asChild, anchorStyle: _, children, ...rest }: PopoverTriggerProps) {
  const { setOpen } = usePopover('PopoverClose')
  const close = () => setOpen(false)
  if (asChild && isValidElement<PressChildProps>(children)) {
    return withPressHandlers(children, { onPress: close })
  }
  return (
    <Pressable accessibilityRole="button" onPress={close} {...rest}>
      {children}
    </Pressable>
  )
}
