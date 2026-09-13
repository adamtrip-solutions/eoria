import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  BackHandler,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewProps,
} from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Portal } from '@/components/ui/portal'
import { Text, type TextProps } from '@/components/ui/text'

export const dialogRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** Full-screen layer that centres the content. */
    root: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    overlay: { backgroundColor: 'rgba(0,0,0,0.45)' },
    content: {
      width: '100%',
      gap: theme.space[5],
      padding: theme.space[6],
      paddingTop: theme.space[3],
      paddingBottom: theme.space[10],
      borderTopLeftRadius: theme.radius['2xl'],
      borderTopRightRadius: theme.radius['2xl'],
      backgroundColor: theme.colors.elevated,
    },
    /** Grabber at the top of a sheet. Hidden when centred. */
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 5,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.border,
      marginBottom: theme.space[2],
    },
    header: { gap: theme.space[1] },
    title: {
      fontSize: theme.fontSize.xl,
      lineHeight: theme.lineHeight.xl,
      fontWeight: theme.fontWeight.semibold,
      letterSpacing: -0.3,
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
    placement: {
      bottom: {},
      center: {
        root: { justifyContent: 'center', padding: theme.space[6] },
        // Corner and side properties beat the shorthand in RN, so set them all.
        content: {
          maxWidth: 400,
          paddingTop: theme.space[6],
          paddingBottom: theme.space[6],
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          borderBottomLeftRadius: theme.radius.xl,
          borderBottomRightRadius: theme.radius.xl,
        },
        handle: { display: 'none' },
      },
    },
  },
  defaultVariants: { placement: 'bottom' },
}))

type DialogSlots = 'overlay' | 'content' | 'handle' | 'header' | 'title' | 'description' | 'footer'

type Ctx = {
  open: boolean
  placement: 'center' | 'bottom'
  setOpen: (open: boolean) => void
  styles: SlotStyles<DialogSlots>
  titleId: string
  descriptionId: string
}
const DialogContext = createContext<Ctx | null>(null)

function useDialog(part: string) {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Dialog>`)
  return ctx
}

const DURATION = 120
const easeOut = Easing.out(Easing.quad)
const easeIn = Easing.in(Easing.quad)

/** Short fade with a barely-there scale. No springs. */
const contentIn: EntryExitAnimationFunction = () => {
  'worklet'
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.97 }] },
    animations: {
      opacity: withTiming(1, { duration: DURATION, easing: easeOut }),
      transform: [{ scale: withTiming(1, { duration: DURATION, easing: easeOut }) }],
    },
  }
}
const contentOut: EntryExitAnimationFunction = () => {
  'worklet'
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: DURATION, easing: easeIn }),
      transform: [{ scale: withTiming(0.97, { duration: DURATION, easing: easeIn }) }],
    },
  }
}
/** Bottom placement slides a short distance instead of scaling. */
const sheetIn: EntryExitAnimationFunction = () => {
  'worklet'
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 24 }] },
    animations: {
      opacity: withTiming(1, { duration: DURATION, easing: easeOut }),
      transform: [{ translateY: withTiming(0, { duration: DURATION, easing: easeOut }) }],
    },
  }
}
const sheetOut: EntryExitAnimationFunction = () => {
  'worklet'
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: {
      opacity: withTiming(0, { duration: DURATION, easing: easeIn }),
      transform: [{ translateY: withTiming(24, { duration: DURATION, easing: easeIn }) }],
    },
  }
}

export type DialogProps = RecipeVariants<typeof dialogRecipe> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  styles?: SlotOverrides<DialogSlots>
  children?: ReactNode
}

export function Dialog({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  placement,
  styles,
  children,
}: DialogProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ?? uncontrolled
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )
  const s = useRecipe(dialogRecipe, { placement }, styles)
  const id = useId()
  const ids = { titleId: `${id}-title`, descriptionId: `${id}-description` }

  useEffect(() => {
    if (!open) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false)
      return true
    })
    return () => sub.remove()
  }, [open, setOpen])

  return (
    <DialogContext.Provider
      value={{ open, setOpen, placement: placement ?? 'bottom', styles: s, ...ids }}
    >
      {children}
    </DialogContext.Provider>
  )
}

type TriggerProps = {
  asChild?: boolean
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }> | ReactNode
}

/** Wraps `children` to open the dialog. With `asChild`, injects `onPress` into the single child instead. */
export function DialogTrigger({
  asChild,
  children,
  ...rest
}: TriggerProps & Omit<PressableProps, 'children'>) {
  const { setOpen } = useDialog('DialogTrigger')
  if (asChild && isValidElement(children)) {
    const child = Children.only(children) as ReactElement<{
      onPress?: (...args: unknown[]) => void
    }>
    return cloneElement(child, {
      onPress: (...args: unknown[]) => {
        child.props.onPress?.(...args)
        setOpen(true)
      },
    })
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => setOpen(true)} {...rest}>
      {children}
    </Pressable>
  )
}

export function DialogClose({
  asChild,
  children,
  ...rest
}: TriggerProps & Omit<PressableProps, 'children'>) {
  const { setOpen } = useDialog('DialogClose')
  if (asChild && isValidElement(children)) {
    const child = Children.only(children) as ReactElement<{
      onPress?: (...args: unknown[]) => void
    }>
    return cloneElement(child, {
      onPress: (...args: unknown[]) => {
        child.props.onPress?.(...args)
        setOpen(false)
      },
    })
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => setOpen(false)} {...rest}>
      {children}
    </Pressable>
  )
}

export type DialogContentProps = ViewProps & {
  /** Tap on the overlay closes the dialog. Default true. */
  dismissable?: boolean
  children?: ReactNode
}

/**
 * Portals the overlay and the content. Renders nothing while closed.
 * The portal breaks React context, so the dialog context is re-provided
 * inside it. iOS hides the app behind the host via `modal`; Android has no
 * equivalent, so the overlay stays in the accessibility tree for dismissal.
 */
export function DialogContent({
  dismissable = true,
  style,
  children,
  ...rest
}: DialogContentProps) {
  const ctx = useDialog('DialogContent')
  const { open, setOpen, styles, titleId, placement } = ctx
  if (!open) return null
  return (
    <Portal modal>
      <DialogContext.Provider value={ctx}>
        <Animated.View
          entering={FadeIn.duration(DURATION)}
          exiting={FadeOut.duration(DURATION)}
          style={[StyleSheet.absoluteFill, styles.overlay]}
        >
          {dismissable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={() => setOpen(false)}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={StyleSheet.absoluteFill}
            />
          )}
        </Animated.View>
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.root]}>
          <Animated.View
            entering={placement === 'bottom' ? sheetIn : contentIn}
            exiting={placement === 'bottom' ? sheetOut : contentOut}
            accessibilityLabelledBy={titleId}
            style={[styles.content, style]}
            {...rest}
          >
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </View>
      </DialogContext.Provider>
    </Portal>
  )
}

export function DialogHeader({ style, ...rest }: ViewProps) {
  return <View style={[useDialog('DialogHeader').styles.header, style]} {...rest} />
}

export function DialogTitle({ style, ...rest }: TextProps) {
  const { styles, titleId } = useDialog('DialogTitle')
  return (
    <Text nativeID={titleId} accessibilityRole="header" style={[styles.title, style]} {...rest} />
  )
}

export function DialogDescription({ style, ...rest }: TextProps) {
  const { styles, descriptionId } = useDialog('DialogDescription')
  return <Text nativeID={descriptionId} style={[styles.description, style]} {...rest} />
}

export function DialogFooter({ style, ...rest }: ViewProps) {
  return <View style={[useDialog('DialogFooter').styles.footer, style]} {...rest} />
}
