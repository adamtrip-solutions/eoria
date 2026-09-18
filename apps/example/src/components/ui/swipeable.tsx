import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  I18nManager,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
} from '@eoria/core'
import { Text } from '@/components/ui/text'

/**
 * Row that slides sideways to show actions, as in Mail. It wraps gesture-handler's
 * ReanimatedSwipeable, so the drag runs on the UI thread and the app needs a
 * `GestureHandlerRootView` at its root.
 *
 * The actions sit under the row, which is why `content` has a fill. It is the
 * screen `background`; an Item inside an ItemGroup paints the group fill over it.
 */
export const swipeableRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** Clips the row and its actions. Inside an ItemGroup the group clips the corners. */
    root: {},
    content: { backgroundColor: theme.colors.background },
    /** One per side. Keeps the actions in source order. */
    actions: { flexDirection: 'row' },
  },
  variants: {},
  defaultVariants: {},
}))

export const swipeableActionRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** No height, so the action stretches to the row. */
    root: {
      width: theme.control.lg + theme.space[4],
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.space[1],
      paddingHorizontal: theme.space[1],
      backgroundColor: theme.colors.muted,
    },
    /** Own View layered over the fill while pressed. */
    rootPressed: { backgroundColor: theme.colors.foreground, opacity: 0.08 },
    rootDisabled: { opacity: 0.5 },
    label: {
      fontSize: theme.fontSize.xs,
      lineHeight: theme.lineHeight.xs,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.foreground,
    },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 22, height: 22, color: theme.colors.foreground },
  },
  variants: {
    variant: {
      default: {},
      primary: {
        root: { backgroundColor: theme.colors.primary },
        rootPressed: { backgroundColor: theme.colors.primaryForeground, opacity: 0.16 },
        label: { color: theme.colors.primaryForeground },
        icon: { color: theme.colors.primaryForeground },
      },
      destructive: {
        root: { backgroundColor: theme.colors.destructive },
        rootPressed: { backgroundColor: theme.colors.destructiveForeground, opacity: 0.16 },
        label: { color: theme.colors.destructiveForeground },
        icon: { color: theme.colors.destructiveForeground },
      },
    },
  },
  defaultVariants: { variant: 'default' },
}))

export type SwipeableSide = 'leading' | 'trailing'

type ActionEntry = { name: string; label: string; run: () => void }
type Ctx = {
  close: () => void
  /** Actions register here so the row can offer them to screen readers. */
  register: (entry: ActionEntry) => () => void
}
const SwipeableContext = createContext<Ctx | null>(null)

export type SwipeableRef = {
  close: () => void
  openLeading: () => void
  openTrailing: () => void
}

type RowProps = {
  accessibilityActions?: ReadonlyArray<AccessibilityActionInfo>
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void
}

export type SwipeableProps = RecipeVariants<typeof swipeableRecipe> & {
  /** Actions shown when the row moves towards the end of the line. */
  leading?: ReactNode
  /** Actions shown when the row moves towards the start of the line. */
  trailing?: ReactNode
  onOpen?: (side: SwipeableSide) => void
  onClose?: () => void
  /** How far the row has to travel before it opens on release. Default 40. */
  threshold?: number
  disabled?: boolean
  styles?: SlotOverrides<'content' | 'actions'>
  style?: StyleProp<ViewStyle>
  /** One element, the row. It receives the actions as `accessibilityActions`. */
  children: ReactElement<RowProps>
}

/** A drag that never activates. Keeps a side without actions from claiming the touch. */
const NEVER = 100000
const DRAG_OFFSET = 10

export const Swipeable = forwardRef<SwipeableRef, SwipeableProps>(function Swipeable(
  { leading, trailing, onOpen, onClose, threshold = 40, disabled = false, styles, style, children },
  ref,
) {
  const s = useRecipe(swipeableRecipe, {}, styles)
  const inner = useRef<SwipeableMethods>(null)
  const [openSide, setOpenSide] = useState<SwipeableSide | null>(null)

  // gesture-handler thinks in left and right; the props follow the reading direction.
  const rtl = I18nManager.isRTL
  const left = rtl ? trailing : leading
  const right = rtl ? leading : trailing
  const sideOf = (direction: SwipeDirection): SwipeableSide =>
    (direction === SwipeDirection.RIGHT) !== rtl ? 'leading' : 'trailing'

  const close = useCallback(() => inner.current?.close(), [])
  useImperativeHandle(
    ref,
    () => ({
      close,
      openLeading: () => (rtl ? inner.current?.openRight() : inner.current?.openLeft()),
      openTrailing: () => (rtl ? inner.current?.openLeft() : inner.current?.openRight()),
    }),
    [close, rtl],
  )

  const [entries, setEntries] = useState<ActionEntry[]>([])
  const register = useCallback((entry: ActionEntry) => {
    setEntries((list) => [...list.filter((e) => e.name !== entry.name), entry])
    return () => setEntries((list) => list.filter((e) => e.name !== entry.name))
  }, [])

  const row =
    isValidElement(children) && entries.length > 0
      ? cloneElement(children, {
          accessibilityActions: [
            ...(children.props.accessibilityActions ?? []),
            ...entries.map(({ name, label }) => ({ name, label })),
          ],
          onAccessibilityAction: (e: AccessibilityActionEvent) => {
            children.props.onAccessibilityAction?.(e)
            entries.find((entry) => entry.name === e.nativeEvent.actionName)?.run()
          },
        })
      : children

  const panel = (actions: ReactNode) => () => (
    // The panel sits under the row where a screen reader could still land on it.
    // The row offers the same actions, so the panel stays out of the tree.
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={s.actions}
    >
      {actions}
    </View>
  )

  return (
    <SwipeableContext.Provider value={{ close, register }}>
      <ReanimatedSwipeable
        ref={inner}
        enabled={!disabled}
        // The row follows the finger exactly and resists once the actions are out.
        friction={1}
        overshootFriction={8}
        leftThreshold={threshold}
        rightThreshold={threshold}
        // A closed row only claims drags towards a side that has actions, so the
        // stack's swipe-back and other horizontal gestures keep working elsewhere.
        dragOffsetFromLeft={left || openSide ? DRAG_OFFSET : NEVER}
        dragOffsetFromRight={right || openSide ? -DRAG_OFFSET : -NEVER}
        renderLeftActions={left ? panel(left) : undefined}
        renderRightActions={right ? panel(right) : undefined}
        onSwipeableWillOpen={(direction) => setOpenSide(sideOf(direction))}
        onSwipeableWillClose={() => setOpenSide(null)}
        onSwipeableOpen={(direction) => onOpen?.(sideOf(direction))}
        onSwipeableClose={() => onClose?.()}
        containerStyle={[s.root, style]}
      >
        {/* gesture-handler animates its own row wrapper, and a Unistyles style on that
            view drops the transform. The fill goes on a View inside it instead. */}
        <View style={s.content}>{row}</View>
      </ReanimatedSwipeable>
    </SwipeableContext.Provider>
  )
})

export type SwipeableActionProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> &
  RecipeVariants<typeof swipeableActionRecipe> & {
    /** The label under the icon. An action without one needs an `accessibilityLabel`. */
    children?: ReactNode
    /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
    icon?: ReactElement<{ size?: number; color?: string }>
    /** Takes no event, because a screen reader runs it without a press. */
    onPress?: () => void
    /** Close the row after the press. Default true. */
    closeOnPress?: boolean
    styles?: SlotOverrides<'rootPressed' | 'rootDisabled' | 'label' | 'icon'>
  }

export function SwipeableAction({
  variant,
  icon,
  onPress,
  closeOnPress = true,
  disabled,
  styles,
  accessibilityLabel,
  children,
  ...rest
}: SwipeableActionProps) {
  const ctx = useContext(SwipeableContext)
  if (!ctx) throw new Error('SwipeableAction must be rendered inside <Swipeable>')
  const { close, register } = ctx
  const s = useRecipe(swipeableActionRecipe, { variant }, styles)

  const label = accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
  const run = () => {
    onPress?.()
    if (closeOnPress) close()
  }
  // Latest handler for the screen-reader action, which outlives the render.
  const latest = useRef(run)
  latest.current = run
  const name = useId()
  useEffect(() => {
    if (!label || disabled) return
    return register({ name, label, run: () => latest.current() })
  }, [name, label, disabled, register])

  const iconNode = isValidElement(icon)
    ? cloneElement(icon, {
        size: getStyleValue(s.icon, 'width') as number | undefined,
        color: getStyleValue(s.icon, 'color') as string | undefined,
      })
    : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={run}
      style={[s.root, disabled && s.rootDisabled]}
      {...rest}
    >
      {({ pressed }) => (
        <>
          {iconNode}
          {typeof children === 'string' ? (
            <Text numberOfLines={1} style={s.label}>
              {children}
            </Text>
          ) : (
            children
          )}
          {pressed ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.rootPressed]} />
          ) : null}
        </>
      )}
    </Pressable>
  )
}
