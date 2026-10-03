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
  useLayoutEffect,
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
  Pressable,
  StyleSheet,
  View,
  type FlatListProps,
  type PressableProps,
  type ViewProps,
} from 'react-native'
import { Easing, runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated'
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
    /**
     * Bar around `SheetContent`'s `footer`, on top of the `footer` slot. Opaque, so content
     * scrolling under it stays hidden.
     */
    pinnedFooter: {
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

type Ctx = {
  open: boolean
  setOpen: (open: boolean) => void
  styles: SlotStyles<SheetSlots>
  titleId: string
  /** Title node, the focus target once the sheet has opened. */
  titleRef: RefObject<View | null>
  modalRef: RefObject<BottomSheetModal | null>
  onDismissRef: RefObject<(() => void) | undefined>
  /** Set inside the sheet when `SheetContent` has a `footer`, so lists pad for it. */
  hasFooter?: boolean
}
const SheetContext = createContext<Ctx | null>(null)

function useSheet(part: string) {
  const ctx = useContext(SheetContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Sheet>`)
  return ctx
}

/** A value that components rendered by the library can subscribe to, as Portal does. */
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

/**
 * Presented sheets, in presentation order. The last one is the top: only it is reachable by
 * screen readers, takes focus and handles Android back. Kept on `globalThis` so a Fast
 * Refresh does not split it between old and new closures.
 */
const shared = globalThis as { __eoriaSheets?: Store<readonly object[]> }
const openSheets = (shared.__eoriaSheets ??= createStore<readonly object[]>([]))
const pushSheet = (token: object) =>
  openSheets.set([...openSheets.get().filter((t) => t !== token), token])
const dropSheet = (token: object) => openSheets.set(openSheets.get().filter((t) => t !== token))
const isTop = (token: object) => openSheets.get().at(-1) === token

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
  /**
   * Called once the sheet has finished closing, however it was closed. Not called when
   * `Sheet` or `SheetContent` unmounts while the sheet is open.
   */
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
  useLayoutEffect(() => {
    onDismissRef.current = onDismiss
  })

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
      value={{ open, setOpen, styles: s, titleId, titleRef, modalRef, onDismissRef }}
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
  | 'enableDismissOnClose'
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
  /**
   * Stays on the bottom edge and above the keyboard while the content scrolls under it.
   * It renders outside the content, so a provider placed inside the sheet body does not
   * reach it.
   */
  footer?: ReactNode
  style?: ViewProps['style']
  children?: ReactNode
}

const TIMING = { duration: 220, easing: Easing.out(Easing.cubic) }

type Latest = {
  open: boolean
  setOpen: (open: boolean) => void
  containerComponent?: ComponentType<PropsWithChildren>
  focus: () => void
  frameMounted: (mounted: boolean) => void
}

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
  footer,
  snapPoints,
  index: initialIndex = 0,
  animateOnMount = true,
  enableDynamicSizing = snapPoints == null,
  keyboardBlurBehavior = 'restore',
  stackBehavior = 'push',
  animatedIndex: providedIndex,
  containerComponent,
  onChange,
  style,
  children,
  ...rest
}: SheetContentProps) {
  const ctx = useSheet('SheetContent')
  const { open, setOpen, styles, modalRef, titleRef, onDismissRef } = ctx
  const handleRef = useRef<View>(null)
  const [token] = useState(() => ({}))

  // `shown`: present() was called and the library has not reported the dismissal yet.
  // `ready`: the library has laid the sheet out, so dismiss() can animate it closed.
  // `closing`: this component asked for the dismissal.
  const shown = useRef(false)
  const ready = useRef(false)
  const closing = useRef(false)
  const portal = useRef(false)
  const unmounted = useRef(false)
  const index = useRef(-1)

  // Only the top sheet takes focus, so one that finishes opening under another stays quiet.
  const focus = useCallback(() => {
    if (!isTop(token)) return
    const target = titleRef.current ?? (accessibilityLabel ? handleRef.current : null)
    if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus')
  }, [token, titleRef, accessibilityLabel])

  // Values the library's callbacks read later. Written after commit, never during render.
  const latest = useRef<Latest>({
    open,
    setOpen,
    containerComponent,
    focus,
    frameMounted: () => {},
  })
  useLayoutEffect(() => {
    latest.current = {
      open,
      setOpen,
      containerComponent,
      focus,
      frameMounted: (mounted) => {
        portal.current = mounted
      },
    }
  })
  const [frame] = useState(() => createFrame(token, latest))

  const present = useCallback(() => {
    shown.current = true
    pushSheet(token)
    modalRef.current?.present()
  }, [modalRef, token])

  useEffect(() => {
    if (open && !shown.current) present()
    else if (!open && shown.current && !closing.current) {
      closing.current = true
      // Before layout the library drops a dismissal and never shows the sheet again, so a
      // close that early waits for `onLaidOut` below.
      if (ready.current) modalRef.current?.dismiss()
    }
  }, [open, present, modalRef])

  // The modal's ref is still attached during layout-effect cleanup, not in a passive one.
  useLayoutEffect(() => {
    unmounted.current = false
    // A remount in Strict Mode keeps the presentation, so it goes back on the stack.
    if (shown.current) pushSheet(token)
    const modal = modalRef
    return () => {
      unmounted.current = true
      dropSheet(token)
      // Once the library has rendered the sheet, close it, or it can stay in the host.
      // Before that there is nothing on screen to remove.
      if (shown.current && (ready.current || portal.current)) {
        closing.current = true
        modal.current?.dismiss()
      }
    }
  }, [modalRef, token])

  // Android back belongs to the top sheet, whatever order the listeners were added in. A
  // sheet listens from presentation until its close animation ends, so a press while it is
  // closing is swallowed rather than reaching the sheet below or the navigator. The keyboard
  // takes the first press on its own, before any listener runs.
  const presented = useSyncExternalStore(
    openSheets.subscribe,
    () => openSheets.get().includes(token),
    () => false,
  )
  useEffect(() => {
    if (!presented) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isTop(token)) return false
      if (latest.current.open) latest.current.setOpen(false)
      return true
    })
    return () => sub.remove()
  }, [presented, token])

  // The library reports no callback when it shows a sheet without animating, so readiness
  // follows the index, which stays -1 until the sheet is laid out. The value is private, so
  // a consumer's `animatedIndex` cannot start it above -1; theirs gets a copy.
  const animatedIndex = useSharedValue(-1)
  const onLaidOut = useCallback(() => {
    if (!shown.current || ready.current) return
    ready.current = true
    if (closing.current) {
      modalRef.current?.dismiss()
    } else if (!animateOnMount) {
      index.current = initialIndex
      latest.current.focus()
    }
  }, [modalRef, animateOnMount, initialIndex])
  useAnimatedReaction(
    () => animatedIndex.value,
    (next, previous) => {
      if (providedIndex) providedIndex.value = next
      if (next > -1 && (previous ?? -1) <= -1) runOnJS(onLaidOut)()
    },
    [animatedIndex, providedIndex, onLaidOut],
  )

  const handleDismiss = useCallback(() => {
    // One report per presentation, even if the library calls this twice.
    if (!shown.current) return
    shown.current = false
    ready.current = false
    portal.current = false
    index.current = -1
    dropSheet(token)
    if (unmounted.current) return
    const requested = closing.current
    closing.current = false
    if (latest.current.open) {
      // Opened again while it was closing: show it again.
      if (requested) present()
      // Closed by a drag or by the library, without passing through `open`.
      else latest.current.setOpen(false)
    }
    onDismissRef.current?.()
  }, [token, present, onDismissRef])

  const handleChange = useCallback<NonNullable<BottomSheetModalProps['onChange']>>(
    (next, position, type) => {
      const previous = index.current
      index.current = next
      if (next >= 0 && previous < 0) focus()
      onChange?.(next, position, type)
    },
    [focus, onChange],
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

  const hasFooter = footer != null
  const inner: Ctx = { ...ctx, hasFooter }

  // The library wants a stable footer component; the node reaches it through a store, so a
  // new `footer` re-renders the bar without remounting the sheet.
  const [footerStore] = useState(() => createStore<ReactNode>(null))
  const [Footer] = useState(() => createFooter(footerStore))
  const footerNode = hasFooter ? (
    <SheetContext.Provider value={inner}>
      <TextInputContext.Provider value={SheetTextInput}>
        <View style={[styles.footer, styles.pinnedFooter]}>{footer}</View>
      </TextInputContext.Provider>
    </SheetContext.Provider>
  ) : null
  useLayoutEffect(() => {
    footerStore.set(footerNode)
  })

  const items = Children.toArray(children)
  const list = items.some((child) => isValidElement(child) && child.type === SheetList)

  const body = (
    <SheetContext.Provider value={inner}>
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
      index={initialIndex}
      animateOnMount={animateOnMount}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={dismissable}
      keyboardBlurBehavior={keyboardBlurBehavior}
      stackBehavior={stackBehavior}
      backdropComponent={backdrop}
      backgroundStyle={styles.background}
      handleComponent={handle}
      footerComponent={hasFooter ? Footer : undefined}
      // The library makes its content one accessible element. Children need their own.
      accessible={false}
      {...rest}
      animatedIndex={animatedIndex}
      enableDismissOnClose
      containerComponent={frame}
      onChange={handleChange}
      onDismiss={handleDismiss}
    >
      {body}
    </BottomSheetModal>
  )
}

const LIST_BODY = { flex: 1, paddingBottom: 0 } as const

/**
 * The layer around backdrop and sheet. The newest open sheet is modal for VoiceOver and
 * closes on the escape gesture; a sheet with another one above it is hidden from screen
 * readers, and gets focus back when it is on top again. The library wants a stable
 * component here, so each SheetContent creates one.
 */
function createFrame(token: object, latest: RefObject<Latest>) {
  return function SheetFrame({ children }: PropsWithChildren) {
    const top = useSyncExternalStore(
      openSheets.subscribe,
      () => isTop(token),
      () => true,
    )
    const covered = useRef(false)
    useLayoutEffect(() => {
      latest.current.frameMounted(true)
      return () => latest.current.frameMounted(false)
    }, [])
    useEffect(() => {
      if (!top) covered.current = true
      else if (covered.current) {
        covered.current = false
        latest.current.focus()
      }
    }, [top])
    const Outer = latest.current.containerComponent
    const layer = (
      <View
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
        accessibilityViewIsModal={top}
        accessibilityElementsHidden={!top}
        importantForAccessibility={top ? 'auto' : 'no-hide-descendants'}
        onAccessibilityEscape={() => latest.current.setOpen(false)}
      >
        {children}
      </View>
    )
    return Outer ? <Outer>{layer}</Outer> : layer
  }
}

function createFooter(store: Store<ReactNode>) {
  return function SheetPinnedFooter(props: BottomSheetFooterProps) {
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

export function SheetFooter({ style, ...rest }: ViewProps) {
  return <View style={[useSheet('SheetFooter').styles.footer, style]} {...rest} />
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
  const { styles, hasFooter = false } = useSheet('SheetList')
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
