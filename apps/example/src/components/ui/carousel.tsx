import {
  Children,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Pressable,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'

/**
 * Horizontal pager over a snapping ScrollView. `itemWidth="full"` is one slide
 * per page, as in onboarding. A number narrower than the carousel leaves the
 * neighbours peeking, as in a row of cards. The dots follow the scroll position
 * on the UI thread, so they move with the finger.
 *
 * Right-to-left layouts are not handled yet. Offsets are read left to right.
 */
export const carouselRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { gap: theme.space[4] },
    /** The ScrollView. */
    viewport: { flexGrow: 0 },
    /** Its content container. The carousel adds the gap and the side insets. */
    content: { flexDirection: 'row' },
    item: {},
    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: theme.space[2],
      minHeight: 44,
    },
    /** `width` is the resting size of a dot. */
    dot: {
      width: 6,
      height: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.foreground,
    },
    /** `width` the dot of the current page grows to. */
    dotActive: { width: 18 },
    /** `opacity` of the other dots. */
    dotInactive: { opacity: 0.25 },
  },
  variants: {},
  defaultVariants: {},
}))

type CarouselSlots = 'viewport' | 'content' | 'item' | 'dots' | 'dot' | 'dotActive' | 'dotInactive'
type Ctx = {
  styles: SlotStyles<CarouselSlots>
  scrollRef: AnimatedRef<Animated.ScrollView>
  /** Scroll position in pages, fractional while dragging. */
  progress: SharedValue<number>
  index: number
  count: number
  setCount: (count: number) => void
  setViewport: (width: number) => void
  itemWidth: number
  gap: number
  insetStart: number
  insetEnd: number
  scrollTo: (index: number, animated?: boolean) => void
  reportIndex: (index: number) => void
}
const CarouselContext = createContext<Ctx | null>(null)

function useCarousel(part: string) {
  const ctx = useContext(CarouselContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Carousel>`)
  return ctx
}

export type CarouselRef = {
  /** Animated unless `animated` is false or the OS reduce motion setting is on. */
  scrollTo: (index: number, animated?: boolean) => void
}

export type CarouselProps = ViewProps &
  RecipeVariants<typeof carouselRecipe> & {
    index?: number
    defaultIndex?: number
    /** Fires when the page nearest the scroll position changes. */
    onIndexChange?: (index: number) => void
    /** `full` is the width of the carousel. A number is in points. Default `full`. */
    itemWidth?: 'full' | number
    /** Space between items, in points. Default 0. */
    gap?: number
    /** Where a narrower item rests. `center` lets both neighbours peek, `start` only the next. */
    align?: 'center' | 'start'
    styles?: SlotOverrides<CarouselSlots>
    children?: ReactNode
  }

const clamp = (n: number, lo: number, hi: number) => {
  'worklet'
  return Math.min(hi, Math.max(lo, n))
}

export const Carousel = forwardRef<CarouselRef, CarouselProps>(function Carousel(
  {
    index: controlled,
    defaultIndex = 0,
    onIndexChange,
    itemWidth: itemWidthProp = 'full',
    gap = 0,
    align = 'center',
    styles,
    style,
    accessible,
    accessibilityLabel,
    children,
    ...rest
  },
  ref,
) {
  const s = useRecipe(carouselRecipe, {}, styles)
  const scrollRef = useAnimatedRef<Animated.ScrollView>()
  const reduced = useReducedMotion()
  const [viewport, setViewport] = useState(0)
  const [count, setCount] = useState(0)
  const [uncontrolled, setUncontrolled] = useState(defaultIndex)
  const asked = Math.max(0, controlled ?? uncontrolled)
  // The pages report their number after the first render; do not clamp to zero before.
  const index = count > 0 ? Math.min(asked, count - 1) : asked

  const itemWidth = itemWidthProp === 'full' ? viewport : Math.min(itemWidthProp, viewport)
  const interval = itemWidth + gap
  // Every page snaps to the same place, the last one included, so the end
  // inset leaves room for the last item to reach it.
  const insetStart = align === 'center' ? (viewport - itemWidth) / 2 : 0
  const insetEnd = align === 'center' ? insetStart : viewport - itemWidth

  const progress = useSharedValue(index)
  /** The page the ScrollView is on, as opposed to the one the props ask for. */
  const scrolled = useRef(index)

  const latest = useRef({ controlled, onIndexChange })
  latest.current = { controlled, onIndexChange }
  const reportIndex = useCallback((next: number) => {
    if (next === scrolled.current) return
    scrolled.current = next
    if (latest.current.controlled === undefined) setUncontrolled(next)
    latest.current.onIndexChange?.(next)
  }, [])

  const scrollTo = useCallback(
    (next: number, animated = true) => {
      if (interval <= 0) return
      const x = clamp(next, 0, Math.max(0, count - 1)) * interval
      scrollRef.current?.scrollTo({ x, y: 0, animated: animated && !reduced })
    },
    [interval, count, reduced, scrollRef],
  )
  useImperativeHandle(ref, () => ({ scrollTo }), [scrollTo])

  // Land on the page without a scroll after the first measure, a rotation or a new item width.
  const ready = interval > 0 && count > 0
  useEffect(() => {
    if (ready) scrollRef.current?.scrollTo({ x: index * interval, y: 0, animated: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, ready])
  // Follow a controlled `index`; a swipe already moved the ScrollView itself.
  useEffect(() => {
    if (index !== scrolled.current) scrollTo(index)
  }, [index, scrollTo])

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') scrollTo(index + 1)
    if (e.nativeEvent.actionName === 'decrement') scrollTo(index - 1)
    rest.onAccessibilityAction?.(e)
  }

  return (
    <CarouselContext.Provider
      value={{
        styles: s,
        scrollRef,
        progress,
        index,
        count,
        setCount,
        setViewport,
        itemWidth,
        gap,
        insetStart,
        insetEnd,
        scrollTo,
        reportIndex,
      }}
    >
      <View
        style={[s.root, style]}
        {...rest}
        // `accessible` turns the whole carousel into one adjustable element, which
        // suits slides that are only images. Left off, the slides stay readable
        // and `CarouselDots` is the adjustable element.
        {...(accessible
          ? {
              accessible,
              accessibilityRole: 'adjustable' as const,
              accessibilityLabel,
              accessibilityValue: { text: `${index + 1} of ${count}` },
              accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
              onAccessibilityAction,
            }
          : { accessibilityLabel })}
      >
        {children}
      </View>
    </CarouselContext.Provider>
  )
})

export type CarouselContentProps = Omit<ScrollViewProps, 'horizontal' | 'onScroll'>

/** The scrolling track. Every direct child is one page, usually a `CarouselItem`. */
export function CarouselContent({
  style,
  contentContainerStyle,
  onLayout,
  children,
  ...rest
}: CarouselContentProps) {
  const ctx = useCarousel('CarouselContent')
  const { styles, scrollRef, progress, setCount, setViewport, itemWidth, gap, reportIndex } = ctx
  const count = Children.toArray(children).length
  useLayoutEffect(() => setCount(count), [count, setCount])

  const interval = itemWidth + gap
  /** Last page sent to JS, so a scroll reports each page once. */
  const sent = useSharedValue(ctx.index)
  const onScroll = useAnimatedScrollHandler(
    (e) => {
      if (interval <= 0 || count === 0) return
      progress.value = clamp(e.contentOffset.x / interval, 0, count - 1)
      const page = Math.round(progress.value)
      if (page !== sent.value) {
        sent.value = page
        runOnJS(reportIndex)(page)
      }
    },
    [interval, count],
  )

  const handleLayout = (e: LayoutChangeEvent) => {
    setViewport(e.nativeEvent.layout.width)
    onLayout?.(e)
  }

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      // One page per swipe, however hard the flick.
      snapToInterval={interval > 0 ? interval : undefined}
      decelerationRate="fast"
      disableIntervalMomentum
      scrollEventThrottle={16}
      onScroll={onScroll}
      onLayout={handleLayout}
      style={[styles.viewport, style]}
      contentContainerStyle={[
        styles.content,
        { gap, paddingStart: ctx.insetStart, paddingEnd: ctx.insetEnd },
        contentContainerStyle,
      ]}
      {...rest}
    >
      {children}
    </Animated.ScrollView>
  )
}

export function CarouselItem({ style, ...rest }: ViewProps) {
  const { styles, itemWidth } = useCarousel('CarouselItem')
  return <View style={[styles.item, { width: itemWidth }, style]} {...rest} />
}

function Dot({ page }: { page: number }) {
  const { styles, progress, scrollTo } = useCarousel('CarouselDots')
  const base = (getStyleValue(styles.dot, 'width') as number | undefined) ?? 6
  const active = (getStyleValue(styles.dotActive, 'width') as number | undefined) ?? 18
  const faded = (getStyleValue(styles.dotInactive, 'opacity') as number | undefined) ?? 0.25
  const gap = (getStyleValue(styles.dots, 'gap') as number | undefined) ?? 0
  const animated = useAnimatedStyle(() => {
    // 1 on this page, 0 a full page away.
    const near = 1 - Math.min(1, Math.abs(progress.value - page))
    return { width: base + (active - base) * near, opacity: faded + (1 - faded) * near }
  })
  return (
    <Pressable
      // The dots are small; the slop covers the 44pt row and half the gap to each neighbour.
      hitSlop={{ top: 19, bottom: 19, left: gap / 2, right: gap / 2 }}
      onPress={() => scrollTo(page)}
    >
      <Animated.View style={[styles.dot, animated]} />
    </Pressable>
  )
}

/**
 * Page indicator, one dot per page, the current one wider. Tap a dot to go to
 * its page. For screen readers the row is one adjustable element, as
 * UIPageControl is.
 */
export function CarouselDots({ style, accessibilityLabel = 'Page', ...rest }: ViewProps) {
  const { styles, index, count, scrollTo } = useCarousel('CarouselDots')
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') scrollTo(index + 1)
    if (e.nativeEvent.actionName === 'decrement') scrollTo(index - 1)
  }
  if (count < 2) return null
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: `${index + 1} of ${count}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      style={[styles.dots, style]}
      {...rest}
    >
      {Array.from({ length: count }, (_, page) => (
        <Dot key={page} page={page} />
      ))}
    </View>
  )
}
