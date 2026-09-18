import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Pressable, ScrollView, StyleSheet, View, type PressableProps } from 'react-native'
import {
  extendSlotRecipe,
  getStyleValue,
  useRecipe,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  dialogRecipe,
  type DialogContentProps,
  type DialogProps,
} from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'

/**
 * Bottom Dialog turned into the iOS action sheet. The sheet surface goes
 * transparent and two floating blocks take its place, one for the actions and
 * one for Cancel. Placement, overlay and motion come from the Dialog base.
 */
export const actionSheetRecipe = extendSlotRecipe(dialogRecipe, (theme) => ({
  slots: {
    /** Top padding keeps a tall sheet clear of the status bar. */
    root: { paddingTop: theme.space[16] },
    /** Shrinks to the screen; `group` and `list` pass the squeeze down to the rows. */
    content: {
      flexShrink: 1,
      gap: theme.space[2],
      paddingTop: 0,
      paddingHorizontal: theme.space[3],
      backgroundColor: 'transparent',
    },
    handle: { display: 'none' },
    /**
     * Block holding the header and the rows. Its fill shows through the
     * hairline `gap` as the separators, so no row needs to know its position.
     */
    group: {
      flexShrink: 1,
      gap: StyleSheet.hairlineWidth,
      borderRadius: theme.radius.card,
      backgroundColor: theme.colors.border,
      overflow: 'hidden',
    },
    header: {
      paddingHorizontal: theme.space[5],
      paddingVertical: theme.space[4],
      backgroundColor: theme.colors.elevated,
    },
    title: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      letterSpacing: 0,
    },
    description: { fontSize: theme.fontSize.sm, lineHeight: theme.lineHeight.sm },
    /** Scrolls when the rows do not fit the screen. */
    list: { flexGrow: 0 },
    listContent: { gap: StyleSheet.hairlineWidth },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      minHeight: theme.control.lg,
      paddingHorizontal: theme.space[5],
      backgroundColor: theme.colors.elevated,
    },
    itemPressed: { backgroundColor: theme.colors.accent },
    itemDisabled: { opacity: 0.5 },
    itemLabel: {
      flex: 1,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.foreground,
    },
    itemLabelDestructive: { color: theme.colors.destructive },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 20, height: 20, color: theme.colors.foreground },
    iconDestructive: { color: theme.colors.destructive },
    cancel: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: theme.control.lg,
      paddingHorizontal: theme.space[5],
      borderRadius: theme.radius.card,
      backgroundColor: theme.colors.elevated,
    },
    cancelPressed: { backgroundColor: theme.colors.accent },
    cancelLabel: {
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
    },
  },
}))

type ActionSheetSlots =
  | 'overlay'
  | 'content'
  | 'handle'
  | 'header'
  | 'title'
  | 'description'
  | 'footer'
  | 'group'
  | 'list'
  | 'listContent'
  | 'item'
  | 'itemPressed'
  | 'itemDisabled'
  | 'itemLabel'
  | 'itemLabelDestructive'
  | 'icon'
  | 'iconDestructive'
  | 'cancel'
  | 'cancelPressed'
  | 'cancelLabel'

const ActionSheetContext = createContext<SlotStyles<ActionSheetSlots> | null>(null)

function useActionSheet(part: string) {
  const ctx = useContext(ActionSheetContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <ActionSheet>`)
  return ctx
}

export type ActionSheetProps = Pick<DialogProps, 'open' | 'defaultOpen' | 'onOpenChange'> & {
  styles?: SlotOverrides<ActionSheetSlots>
  children?: ReactNode
}

export function ActionSheet({ styles, children, ...rest }: ActionSheetProps) {
  const s = useRecipe(actionSheetRecipe, { placement: 'bottom' }, styles)
  return (
    <ActionSheetContext.Provider value={s}>
      <Dialog placement="bottom" styles={s} {...rest}>
        {children}
      </Dialog>
    </ActionSheetContext.Provider>
  )
}

export const ActionSheetTrigger = DialogTrigger

export type ActionSheetContentProps = DialogContentProps

const isPart = (child: ReactNode, part: unknown) => isValidElement(child) && child.type === part

/**
 * Sorts its children into the two blocks. `ActionSheetCancel` goes below on its
 * own, `ActionSheetHeader` stays pinned and everything else scrolls under it.
 * Context does not cross the portal inside `DialogContent`, so it is provided again.
 */
export function ActionSheetContent({ children, ...rest }: ActionSheetContentProps) {
  const styles = useActionSheet('ActionSheetContent')
  const parts = Children.toArray(children)
  const header = parts.filter((child) => isPart(child, ActionSheetHeader))
  const cancel = parts.filter((child) => isPart(child, ActionSheetCancel))
  const rows = parts.filter(
    (child) => !isPart(child, ActionSheetHeader) && !isPart(child, ActionSheetCancel),
  )
  return (
    <DialogContent {...rest}>
      <ActionSheetContext.Provider value={styles}>
        <View accessibilityRole="menu" style={styles.group}>
          {header}
          <ScrollView
            bounces={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {rows}
          </ScrollView>
        </View>
        {cancel}
      </ActionSheetContext.Provider>
    </DialogContent>
  )
}

export type ActionSheetHeaderProps = {
  title?: string
  message?: string
}

/** Title and message above the rows. Both are optional; with neither it renders nothing. */
export function ActionSheetHeader({ title, message }: ActionSheetHeaderProps) {
  const styles = useActionSheet('ActionSheetHeader')
  if (!title && !message) return null
  return (
    <View style={styles.header}>
      {/* The Dialog parts carry the ids the content is labelled by. */}
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      {message ? <DialogDescription>{message}</DialogDescription> : null}
    </View>
  )
}

export type ActionSheetItemProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  /** The label. A string gets the label style; anything else renders as is. */
  children: ReactNode
  /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
  icon?: ReactElement<{ size?: number; color?: string }>
  variant?: 'default' | 'destructive'
  /** Called on press. The sheet closes afterwards unless `closeOnSelect` is false. */
  onSelect?: () => void
  closeOnSelect?: boolean
}

export function ActionSheetItem({
  children,
  icon,
  variant = 'default',
  disabled,
  onSelect,
  closeOnSelect = true,
  ...rest
}: ActionSheetItemProps) {
  const styles = useActionSheet('ActionSheetItem')
  const destructive = variant === 'destructive'
  const iconStyle = destructive ? [styles.icon, styles.iconDestructive] : styles.icon
  const iconNode = isValidElement(icon)
    ? cloneElement(icon, {
        size: getStyleValue(iconStyle, 'width') as number | undefined,
        color: getStyleValue(iconStyle, 'color') as string | undefined,
      })
    : null
  const row = (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
        disabled && styles.itemDisabled,
      ]}
      {...rest}
    >
      {iconNode}
      {typeof children === 'string' ? (
        <Text
          numberOfLines={1}
          style={[styles.itemLabel, destructive && styles.itemLabelDestructive]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
  // DialogClose owns the closing, so the row never needs the Dialog context itself.
  return closeOnSelect ? <DialogClose asChild>{row}</DialogClose> : row
}

export type ActionSheetCancelProps = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode
}

/** Closes the sheet. `ActionSheetContent` renders it as a block of its own under the rows. */
export function ActionSheetCancel({ children = 'Cancel', ...rest }: ActionSheetCancelProps) {
  const styles = useActionSheet('ActionSheetCancel')
  return (
    <DialogClose asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
        {...rest}
      >
        {typeof children === 'string' ? (
          <Text style={styles.cancelLabel}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    </DialogClose>
  )
}
