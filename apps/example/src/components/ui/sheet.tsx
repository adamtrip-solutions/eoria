import {
  Children,
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
  useSyncExternalStore,
  type ComponentType,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  AccessibilityInfo,
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  type FlatListProps,
  type PressableProps,
  type ViewProps,
} from 'react-native'
import { Easing } from 'react-native-reanimated'
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetHandle,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
  type BottomSheetHandleProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { TextInputContext, type TextInputComponent } from '@/components/ui/input'
import { Text, headingFont, type TextProps } from '@/components/ui/text'

/**
 * Draggable bottom sheet on @gorhom/bottom-sheet. Same frame as the bottom Dialog, so the
 * two can sit in one app. Reach for Dialog when the content is a short question and for
 * Sheet when it scrolls, snaps to heights or holds a form.
 */
export const sheetRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** Content container inside the sheet. */
    root: {
      gap: theme.space[5],
      paddingHorizontal: theme.space[6],
      paddingTop: theme.space[2],
      paddingBottom: theme.space[10],
    },
    /** The sheet surface behind the content. */
    background: {
      borderTopLeftRadius: theme.radius['2xl'],
      borderTopRightRadius: theme.radius['2xl'],
      backgroundColor: theme.colors.elevated,
    },
    /** Grabber. Matches the Dialog handle. */
    handle: {
      width: 36,
      height: 5,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.border,
    },
    header: { gap: theme.space[1] },
    title: {
      fontSize: theme.fontSize.xl,
      lineHeight: theme.lineHeight.xl,
      fontWeight: theme.fontWeight.semibold,
      letterSpacing: -0.3,
      ...headingFont(theme),
    },
    description: {
      color: theme.colors.mutedForeground,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
    },
    /** Stacked full-width actions, primary first. */
    footer: { gap: theme.space[2] },
    /** A `pinned` footer. Opaque, so content scrolling under it stays hidden. */
    pinnedFooter: {
      gap: theme.space[2],
      paddingHorizontal: theme.space[6],
      paddingTop: theme.space[3],
      paddingBottom: theme.space[10],
      backgroundColor: theme.colors.elevated,
    },
    /** Content container of `SheetList`. */
    list: { paddingBottom: theme.space[10] },
  },
  variants: {
    /** `flush` drops the side padding for lists that run edge to edge. */
    inset: {
      padded: {},
      flush: { root: { paddingHorizontal: 0 } },
    },
  },
  defaultVariants: { inset: 'padded' },
}))

type SheetSlots =
  'background' | 'handle' | 'header' | 'title' | 'description' | 'footer' | 'pinnedFooter' | 'list'

/** A value that components outside React's tree position can subscribe to, as Portal does. */
type Store<T> = { get: () => T; set: (next: T) => void; subscribe: (l: () => void) => () => void }

function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return
      value = next
      listeners.forEach((l) => l())
    },
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

type Ctx = {
  open: boolean
  setOpen: (open: boolean) => void
  styles: SlotStyles<SheetSlots>
  titleId: string
  /** Title node, the focus target once the sheet has opened. */
  titleRef: RefObject<View | null>
  modalRef: RefObject<BottomSheetModal | null>
  onDismissRef: RefObject<(() => void) | undefined>
  /** The `pinned` footer, rendered by the library's footer slot. */
  footer: Store<ReactNode>
}
const SheetContext = createContext<Ctx | null>(null)

function useSheet(part: string) {
  const ctx = useContext(SheetContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Sheet>`)
  return ctx
}

/** Methods on the `Sheet` ref. They go through `onOpenChange` like a trigger press does. */
export type SheetRef = {
  present: () => void
  dismiss: () => void
  /** Moves an open sheet to one of its `snapPoints`. */
  snapToIndex: (index: number) => void
}

export type SheetProps = RecipeVariants<typeof sheetRecipe> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Called once the sheet has finished closing, however it was closed. */
  onDismiss?: () => void
  styles?: SlotOverrides<SheetSlots>
  children?: ReactNode
}

/** Needs `BottomSheetModalProvider` inside `GestureHandlerRootView` at the root of the app. */
export const Sheet = forwardRef<SheetRef, SheetProps>(function Sheet(
  { open: controlled, defaultOpen = false, onOpenChange, onDismiss, inset, styles, children },
  ref,
) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ?? uncontrolled
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )
  const s = useRecipe(sheetRecipe, { inset }, styles)
  const titleId = `${useId()}-title`
  const titleRef = useRef<View>(null)
  const modalRef = useRef<BottomSheetModal>(null)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss
  const [footer] = useState(() => createStore<ReactNode>(null))

  useImperativeHandle(
    ref,
    () => ({
      present: () => setOpen(true),
      dismiss: () => setOpen(false),
      snapToIndex: (index) => modalRef.current?.snapToIndex(index),
    }),
    [setOpen],
  )

  return (
    <SheetContext.Provider
      value={{
        open,
        setOpen,
        styles: s,
        titleId,
        titleRef,
        modalRef,
        onDismissRef,
        footer,
      }}
    >
      {children}
    </SheetContext.Provider>
  )
})

type TriggerProps = {
  asChild?: boolean
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }> | ReactNode
}

function PressTo({
  next,
  part,
  asChild,
  children,
  ...rest
}: TriggerProps & Omit<PressableProps, 'children'> & { next: boolean; part: string }) {
  const { setOpen } = useSheet(part)
  if (asChild && isValidElement(children)) {
    const child = Children.only(children) as ReactElement<{
      onPress?: (...args: unknown[]) => void
    }>
    return cloneElement(child, {
      onPress: (...args: unknown[]) => {
        child.props.onPress?.(...args)
        setOpen(next)
      },
    })
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => setOpen(next)} {...rest}>
      {children}
    </Pressable>
  )
}

/** Wraps `children` to open the sheet. With `asChild`, injects `onPress` into the single child instead. */
export function SheetTrigger(props: TriggerProps & Omit<PressableProps, 'children'>) {
  return <PressTo next part="SheetTrigger" {...props} />
}

export function SheetClose(props: TriggerProps & Omit<PressableProps, 'children'>) {
  return <PressTo next={false} part="SheetClose" {...props} />
}

/** Fields inside the sheet render the library's input, so its keyboard handling sees focus. */
const SheetTextInput = BottomSheetTextInput as unknown as TextInputComponent

export type SheetContentProps = Omit<
  BottomSheetModalProps,
  | 'children'
  | 'backgroundStyle'
  | 'handleIndicatorStyle'
  | 'backdropComponent'
  | 'footerComponent'
  | 'onDismiss'
> & {
  /** Drag down or tap the backdrop to close. Default true. */
  dismissable?: boolean
  /** Read out for the backdrop when it closes the sheet. Default `"Close"`. */
  closeLabel?: string
  /**
   * Names the sheet when it has no `SheetTitle`. The grabber becomes a header with this
   * label and takes focus on open.
   */
  accessibilityLabel?: string
  /** Wrap the content in a scroll view that hands its gesture to the sheet at the top. */
  scroll?: boolean
  style?: ViewProps['style']
  children?: ReactNode
}

const TIMING = { duration: 220, easing: Easing.out(Easing.cubic) }

/**
 * The sheet itself. Without `snapPoints` it sizes to its content. The library portals the
 * modal out of the tree, which drops React context, so the sheet context is provided again
 * inside it.
 */
export function SheetContent({
  dismissable = true,
  closeLabel = 'Close',
  accessibilityLabel,
  scroll = false,
  snapPoints,
  enableDynamicSizing = snapPoints == null,
  keyboardBlurBehavior = 'restore',
  containerComponent,
  onChange,
  onAnimate,
  style,
  children,
  ...rest
}: SheetContentProps) {
  const ctx = useSheet('SheetContent')
  const { open, setOpen, styles, modalRef, titleRef, onDismissRef, footer } = ctx

  // Latest values for callbacks the library holds on to.
  const latest = useRef({ open, setOpen, containerComponent, dismissable })
  latest.current = { open, setOpen, containerComponent, dismissable }

  // `shown`: present() was called and onDismiss has not fired yet.
  // `started`: the library has begun animating it, so it can take a dismiss().
  // `closing`: this component asked for the dismissal.
  const shown = useRef(false)
  const started = useRef(false)
  const closing = useRef(false)
  const index = useRef(-1)
  const handleRef = useRef<View>(null)
  const [frame] = useState(() => createFrame(latest))

  useEffect(() => {
    if (open && !shown.current) {
      shown.current = true
      Keyboard.dismiss()
      frame.active.set(true)
      modalRef.current?.present()
    } else if (!open && shown.current && !closing.current) {
      closing.current = true
      Keyboard.dismiss()
      // Before its first frame the library would drop the dismissal and never show the
      // sheet again, so a close that early waits for `start` below.
      if (started.current) modalRef.current?.dismiss()
    }
  }, [open, frame, modalRef])

  const start = useCallback(() => {
    if (started.current) return
    started.current = true
    if (closing.current) modalRef.current?.dismiss()
  }, [modalRef])

  // Android back closes the most recently opened sheet. React Native calls the newest
  // listener first and stops at the first that returns true, so stacked sheets close
  // top down and the press never reaches the navigator. The keyboard takes the first
  // press on its own, before any listener runs.
  useEffect(() => {
    if (!open) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      latest.current.setOpen(false)
      return true
    })
    return () => sub.remove()
  }, [open])

  const handleDismiss = useCallback(() => {
    shown.current = false
    started.current = false
    index.current = -1
    frame.active.set(false)
    const requested = closing.current
    closing.current = false
    if (latest.current.open) {
      // Opened again while it was closing: show it again.
      if (requested) {
        shown.current = true
        frame.active.set(true)
        modalRef.current?.present()
      } else {
        // Closed by a drag or by the library, without passing through `open`.
        latest.current.setOpen(false)
      }
    }
    onDismissRef.current?.()
  }, [frame, modalRef, onDismissRef])

  const handleAnimate = useCallback<NonNullable<BottomSheetModalProps['onAnimate']>>(
    (...args) => {
      start()
      onAnimate?.(...args)
    },
    [start, onAnimate],
  )

  const handleChange = useCallback<NonNullable<BottomSheetModalProps['onChange']>>(
    (next, position, type) => {
      start()
      const previous = index.current
      index.current = next
      // -1 while mounted means another sheet minimised this one.
      if (shown.current) frame.active.set(next >= 0)
      if (next >= 0 && previous < 0) {
        const target = titleRef.current ?? (accessibilityLabel ? handleRef.current : null)
        if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus')
      }
      onChange?.(next, position, type)
    },
    [frame, titleRef, accessibilityLabel, onChange, start],
  )

  // The library springs by default. A timing keeps the sheet in step with the rest of the kit.
  const animationConfigs = useBottomSheetTimingConfigs(TIMING)

  // The backdrop's own label and hint are fixed English, so it stays out of the
  // accessibility tree and a labelled button inside it does the closing.
  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
        pressBehavior="none"
        accessible={false}
      >
        {dismissable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={() => latest.current.setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </BottomSheetBackdrop>
    ),
    [dismissable, closeLabel],
  )

  const handleStyle = styles.handle
  const handle = useCallback(
    (props: BottomSheetHandleProps) => (
      <View
        ref={handleRef}
        accessible={accessibilityLabel !== undefined}
        accessibilityRole="header"
        accessibilityLabel={accessibilityLabel}
      >
        <BottomSheetHandle {...props} indicatorStyle={handleStyle} accessible={false} />
      </View>
    ),
    [accessibilityLabel, handleStyle],
  )

  const hasFooter = useSyncExternalStore(
    footer.subscribe,
    () => footer.get() != null,
    () => false,
  )
  const [Footer] = useState(() => createFooter(footer))

  const items = Children.toArray(children)
  const list = items.some((child) => isValidElement(child) && child.type === SheetList)

  const body = (
    <SheetContext.Provider value={ctx}>
      <TextInputContext.Provider value={SheetTextInput}>
        {list ? (
          // The list is the sheet's scrollable. A BottomSheetView around it would claim that role.
          <View style={[styles.root, LIST_BODY, style]}>{children}</View>
        ) : scroll ? (
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            enableFooterMarginAdjustment={hasFooter}
            contentContainerStyle={[styles.root, style]}
          >
            {children}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetView enableFooterMarginAdjustment={hasFooter} style={[styles.root, style]}>
            {children}
          </BottomSheetView>
        )}
      </TextInputContext.Provider>
    </SheetContext.Provider>
  )

  return (
    <BottomSheetModal
      ref={modalRef}
      animationConfigs={animationConfigs}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={dismissable}
      keyboardBlurBehavior={keyboardBlurBehavior}
      backdropComponent={backdrop}
      backgroundStyle={styles.background}
      handleComponent={handle}
      footerComponent={hasFooter ? Footer : undefined}
      // The library makes its content one accessible element. Children need their own.
      accessible={false}
      {...rest}
      containerComponent={frame.Frame}
      onChange={handleChange}
      onAnimate={handleAnimate}
      onDismiss={handleDismiss}
    >
      {body}
    </BottomSheetModal>
  )
}

const LIST_BODY = { flex: 1, paddingBottom: 0 } as const

/**
 * The layer around backdrop and sheet. It marks the sheet modal for VoiceOver, closes it on
 * the escape gesture, and hides a sheet that another one has minimised. The library wants a
 * stable component here, so each SheetContent creates one and feeds it through a store.
 */
function createFrame(
  latest: RefObject<{
    setOpen: (open: boolean) => void
    containerComponent?: ComponentType<PropsWithChildren>
  }>,
) {
  const active = createStore(false)
  function Frame({ children }: PropsWithChildren) {
    const on = useSyncExternalStore(active.subscribe, active.get, active.get)
    const Outer = latest.current.containerComponent
    const layer = (
      <View
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
        accessibilityViewIsModal={on}
        accessibilityElementsHidden={!on}
        importantForAccessibility={on ? 'auto' : 'no-hide-descendants'}
        onAccessibilityEscape={() => latest.current.setOpen(false)}
      >
        {children}
      </View>
    )
    return Outer ? <Outer>{layer}</Outer> : layer
  }
  return { active, Frame }
}

function createFooter(store: Store<ReactNode>) {
  return function Footer(props: BottomSheetFooterProps) {
    const node = useSyncExternalStore(store.subscribe, store.get, store.get)
    return <BottomSheetFooter {...props}>{node}</BottomSheetFooter>
  }
}

export function SheetHeader({ style, ...rest }: ViewProps) {
  return <View style={[useSheet('SheetHeader').styles.header, style]} {...rest} />
}

export function SheetTitle({ style, ...rest }: TextProps) {
  const { styles, titleId, titleRef } = useSheet('SheetTitle')
  // React 19 passes `ref` as a prop, and Text spreads its props onto the native text.
  const focusable = { ref: titleRef } as Partial<TextProps>
  return (
    <Text
      {...focusable}
      nativeID={titleId}
      accessibilityRole="header"
      style={[styles.title, style]}
      {...rest}
    />
  )
}

export function SheetDescription({ style, ...rest }: TextProps) {
  return <Text style={[useSheet('SheetDescription').styles.description, style]} {...rest} />
}

export type SheetFooterProps = ViewProps & {
  /**
   * Keep the footer at the bottom edge of the sheet and above the keyboard, outside the
   * scrolling content. Write it anywhere inside `SheetContent`; it renders in the library's
   * footer slot, so context from between the two does not reach it.
   */
  pinned?: boolean
}

export function SheetFooter({ pinned = false, style, ...rest }: SheetFooterProps) {
  const ctx = useSheet('SheetFooter')
  const { styles, footer } = ctx
  const node = pinned ? (
    <SheetContext.Provider value={ctx}>
      <TextInputContext.Provider value={SheetTextInput}>
        <View style={[styles.pinnedFooter, style]} {...rest} />
      </TextInputContext.Provider>
    </SheetContext.Provider>
  ) : null
  useEffect(() => {
    if (pinned) footer.set(node)
  })
  useEffect(() => {
    if (!pinned) return
    return () => footer.set(null)
  }, [pinned, footer])
  if (pinned) return null
  return <View style={[styles.footer, style]} {...rest} />
}

export type SheetListProps<T> = Omit<FlatListProps<T>, 'decelerationRate' | 'scrollEventThrottle'>

/**
 * Virtualised list that scrolls inside the sheet and hands the drag back at the top. Put it
 * directly inside `SheetContent`, which then fills the sheet instead of sizing to content,
 * so give the sheet `snapPoints`. Taps on rows go through while the keyboard is up.
 */
export function SheetList<T>({
  keyboardShouldPersistTaps = 'handled',
  contentContainerStyle,
  ...rest
}: SheetListProps<T>) {
  const { styles, footer } = useSheet('SheetList')
  const hasFooter = useSyncExternalStore(
    footer.subscribe,
    () => footer.get() != null,
    () => false,
  )
  const List = BottomSheetFlatList as unknown as ComponentType<
    FlatListProps<T> & { enableFooterMarginAdjustment?: boolean }
  >
  return (
    <List
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      enableFooterMarginAdjustment={hasFooter}
      contentContainerStyle={[styles.list, contentContainerStyle]}
      {...rest}
    />
  )
}
