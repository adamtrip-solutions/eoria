import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  BackHandler,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Portal, getPortalHostOffset } from '@/components/ui/portal'

/**
 * Anchored positioning primitive. Popover, Tooltip, DropdownMenu and Select
 * sit on it. Wrap the trigger in `<PopperAnchor>`, render `<PopperContent>`
 * while open: it measures the anchor in window coordinates, lays the content
 * out invisibly in the portal, then places it on the requested side, flipping
 * to the opposite side when it would not fit, and fades it in.
 *
 * Context does not cross the portal. Components re-provide their own inside
 * `PopperContent`'s children, as Dialog does.
 */

export type Rect = { x: number; y: number; width: number; height: number }
export type Side = 'top' | 'bottom' | 'left' | 'right'
export type Align = 'start' | 'center' | 'end'

type Ctx = { anchorRef: RefObject<View | null> }
const PopperContext = createContext<Ctx | null>(null)

function usePopper(part: string) {
  const ctx = useContext(PopperContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Popper>`)
  return ctx
}

export function Popper({ children }: { children?: ReactNode }) {
  const anchorRef = useRef<View>(null)
  return <PopperContext.Provider value={{ anchorRef }}>{children}</PopperContext.Provider>
}

/** Measured wrapper for the trigger. `collapsable={false}` keeps the native view on Android. */
export function PopperAnchor({ style, children, ...rest }: ViewProps) {
  const { anchorRef } = usePopper('PopperAnchor')
  return (
    <View
      ref={anchorRef}
      collapsable={false}
      style={[{ alignSelf: 'flex-start' }, style]}
      {...rest}
    >
      {children}
    </View>
  )
}

type PressHandler = (...args: unknown[]) => void
export type PressChildProps = {
  onPress?: PressHandler
  onLongPress?: PressHandler
  onPressIn?: PressHandler
  onPressOut?: PressHandler
}

/** Adds handlers to a single child element, calling the child's own handler first. */
export function withPressHandlers<P extends PressChildProps>(
  children: ReactElement<P>,
  handlers: PressChildProps,
): ReactElement<P> {
  const child = Children.only(children)
  if (!isValidElement(child)) return children
  const merged: PressChildProps = {}
  for (const key of Object.keys(handlers) as Array<keyof PressChildProps>) {
    const own = child.props[key]
    const added = handlers[key]
    merged[key] = (...args: unknown[]) => {
      own?.(...args)
      added?.(...args)
    }
  }
  return cloneElement(child, merged as Partial<P>)
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
const PAD = 8

type Size = { width: number; height: number }

function place(
  anchor: Rect,
  size: Size,
  win: Size,
  side: Side,
  align: Align,
  sideOffset: number,
  alignOffset: number,
) {
  const fits: Record<Side, boolean> = {
    top: anchor.y - sideOffset - size.height >= PAD,
    bottom: anchor.y + anchor.height + sideOffset + size.height <= win.height - PAD,
    left: anchor.x - sideOffset - size.width >= PAD,
    right: anchor.x + anchor.width + sideOffset + size.width <= win.width - PAD,
  }
  const resolved = fits[side] || !fits[OPPOSITE[side]] ? side : OPPOSITE[side]
  let top = 0
  let left = 0
  const vertical = resolved === 'top' || resolved === 'bottom'
  if (resolved === 'bottom') top = anchor.y + anchor.height + sideOffset
  if (resolved === 'top') top = anchor.y - sideOffset - size.height
  if (resolved === 'right') left = anchor.x + anchor.width + sideOffset
  if (resolved === 'left') left = anchor.x - sideOffset - size.width
  if (vertical) {
    if (align === 'start') left = anchor.x
    else if (align === 'end') left = anchor.x + anchor.width - size.width
    else left = anchor.x + (anchor.width - size.width) / 2
    left += alignOffset
  } else {
    if (align === 'start') top = anchor.y
    else if (align === 'end') top = anchor.y + anchor.height - size.height
    else top = anchor.y + (anchor.height - size.height) / 2
    top += alignOffset
  }
  left = Math.min(Math.max(left, PAD), Math.max(PAD, win.width - PAD - size.width))
  top = Math.min(Math.max(top, PAD), Math.max(PAD, win.height - PAD - size.height))
  const host = getPortalHostOffset()
  return { top: top - host.y, left: left - host.x, side: resolved }
}

export type PopperContentProps = ViewProps & {
  side?: Side
  align?: Align
  /** Gap between anchor and content. Default 6. */
  sideOffset?: number
  alignOffset?: number
  /** Content width follows the anchor width (Select). */
  matchAnchorWidth?: boolean
  /** Tap outside or Android back. Omit for non-dismissable content (Tooltip). */
  onDismiss?: () => void
  /** Hide the rest of the app from screen readers while open. */
  modal?: boolean
  children?: ReactNode
}

const DURATION = 120

export function PopperContent({
  side = 'bottom',
  align = 'center',
  sideOffset = 6,
  alignOffset = 0,
  matchAnchorWidth = false,
  onDismiss,
  modal = false,
  style,
  onLayout,
  children,
  ...rest
}: PopperContentProps) {
  const { anchorRef } = usePopper('PopperContent')
  const win = useWindowDimensions()
  const [anchor, setAnchor] = useState<Rect | null>(null)
  const [size, setSize] = useState<Size | null>(null)
  const opacity = useSharedValue(0)

  const measure = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height })
    })
  }, [anchorRef])

  useEffect(measure, [measure, win.width, win.height])

  useEffect(() => {
    if (!onDismiss) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss()
      return true
    })
    return () => sub.remove()
  }, [onDismiss])

  const position =
    anchor && size ? place(anchor, size, win, side, align, sideOffset, alignOffset) : null

  const ready = position !== null
  useEffect(() => {
    if (ready)
      opacity.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) })
  }, [ready, opacity])

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }))

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height },
    )
    onLayout?.(e)
  }

  return (
    <Portal modal={modal}>
      <PopperContext.Provider value={{ anchorRef }}>
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onDismiss}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Animated.View
          onLayout={handleLayout}
          style={[
            { position: 'absolute' },
            position ? { top: position.top, left: position.left } : { top: 0, left: 0 },
            matchAnchorWidth && anchor ? { width: anchor.width } : null,
            fade,
            style,
          ]}
          {...rest}
        >
          {children}
        </Animated.View>
      </PopperContext.Provider>
    </Portal>
  )
}
