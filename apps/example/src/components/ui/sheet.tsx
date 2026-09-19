import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Pressable, View, type PressableProps, type ViewProps } from 'react-native'
import { Easing } from 'react-native-reanimated'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
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

type SheetSlots = 'background' | 'handle' | 'header' | 'title' | 'description' | 'footer'

type Ctx = {
  open: boolean
  setOpen: (open: boolean) => void
  styles: SlotStyles<SheetSlots>
  titleId: string
}
const SheetContext = createContext<Ctx | null>(null)

function useSheet(part: string) {
  const ctx = useContext(SheetContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Sheet>`)
  return ctx
}

export type SheetProps = RecipeVariants<typeof sheetRecipe> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  styles?: SlotOverrides<SheetSlots>
  children?: ReactNode
}

/** Needs `BottomSheetModalProvider` inside `GestureHandlerRootView` at the root of the app. */
export function Sheet({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  inset,
  styles,
  children,
}: SheetProps) {
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
  return (
    <SheetContext.Provider value={{ open, setOpen, styles: s, titleId }}>
      {children}
    </SheetContext.Provider>
  )
}

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

export type SheetContentProps = Omit<
  BottomSheetModalProps,
  'children' | 'backgroundStyle' | 'handleIndicatorStyle' | 'backdropComponent' | 'onDismiss'
> & {
  /** Drag down or tap the backdrop to close. Default true. */
  dismissable?: boolean
  /** Wrap the content in a scroll view that hands its gesture to the sheet at the top. */
  scroll?: boolean
  style?: ViewProps['style']
  children?: ReactNode
}

/**
 * The sheet itself. Without `snapPoints` it sizes to its content. The library portals the
 * modal out of the tree, which drops React context, so the sheet context is provided again
 * inside it.
 */
export function SheetContent({
  dismissable = true,
  scroll = false,
  style,
  children,
  ...rest
}: SheetContentProps) {
  const ctx = useSheet('SheetContent')
  const { open, setOpen, styles, titleId } = ctx
  const ref = useRef<BottomSheetModal>(null)

  useEffect(() => {
    if (open) ref.current?.present()
    else ref.current?.dismiss()
  }, [open])

  // The library springs by default. A timing keeps the sheet in step with the rest of the kit.
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: 220,
    easing: Easing.out(Easing.cubic),
  })

  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
        pressBehavior={dismissable ? 'close' : 'none'}
      />
    ),
    [dismissable],
  )

  return (
    <BottomSheetModal
      ref={ref}
      animationConfigs={animationConfigs}
      enablePanDownToClose={dismissable}
      backdropComponent={backdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      onDismiss={() => setOpen(false)}
      accessibilityLabelledBy={titleId}
      {...rest}
    >
      <SheetContext.Provider value={ctx}>
        {scroll ? (
          <BottomSheetScrollView contentContainerStyle={[styles.root, style]}>
            {children}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetView style={[styles.root, style]}>{children}</BottomSheetView>
        )}
      </SheetContext.Provider>
    </BottomSheetModal>
  )
}

export function SheetHeader({ style, ...rest }: ViewProps) {
  return <View style={[useSheet('SheetHeader').styles.header, style]} {...rest} />
}

export function SheetTitle({ style, ...rest }: TextProps) {
  const { styles, titleId } = useSheet('SheetTitle')
  return (
    <Text nativeID={titleId} accessibilityRole="header" style={[styles.title, style]} {...rest} />
  )
}

export function SheetDescription({ style, ...rest }: TextProps) {
  return <Text style={[useSheet('SheetDescription').styles.description, style]} {...rest} />
}

export function SheetFooter({ style, ...rest }: ViewProps) {
  return <View style={[useSheet('SheetFooter').styles.footer, style]} {...rest} />
}
