import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type ViewProps,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Text } from '@/components/ui/text'

/**
 * Three looks. `default` is a row of pill chips that scrolls when it does not
 * fit, the common mobile pattern for content filters. `segmented` is the
 * iOS-style control with a sliding thumb, for settings and view switches.
 * `underline` is a bold bar for top-level sections.
 */
export const tabsRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { gap: theme.space[4] },
    list: { flexDirection: 'row', gap: theme.space[2] },
    trigger: {
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.space[4],
      borderRadius: theme.radius.full,
    },
    triggerActive: {},
    triggerPressed: { opacity: 0.7 },
    /** Sliding thumb for `segmented` and bar for `underline`. Hidden for pills. */
    indicator: { position: 'absolute', left: 0, opacity: 0 },
    triggerLabel: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.foreground,
    },
    triggerLabelActive: {},
    triggerDisabled: { opacity: 0.4 },
    content: {},
  },
  variants: {
    variant: {
      default: {
        trigger: { backgroundColor: theme.colors.muted },
        triggerActive: { backgroundColor: theme.colors.foreground },
        triggerLabel: { fontWeight: theme.fontWeight.semibold },
        triggerLabelActive: { color: theme.colors.background },
      },
      segmented: {
        list: {
          padding: 3,
          gap: 0,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.muted,
        },
        trigger: { flex: 1, minHeight: 38, borderRadius: theme.radius.full },
        triggerLabel: { color: theme.colors.mutedForeground },
        triggerLabelActive: {
          color: theme.colors.foreground,
          fontWeight: theme.fontWeight.semibold,
        },
        indicator: {
          opacity: 1,
          top: 3,
          bottom: 3,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.elevated,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        },
      },
      underline: {
        list: {
          gap: theme.space[5],
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        trigger: { borderRadius: 0, paddingHorizontal: 0, paddingBottom: theme.space[2] },
        triggerLabel: {
          fontSize: theme.fontSize.md,
          lineHeight: theme.lineHeight.md,
          color: theme.colors.mutedForeground,
        },
        triggerLabelActive: {
          color: theme.colors.foreground,
          fontWeight: theme.fontWeight.semibold,
        },
        indicator: {
          opacity: 1,
          bottom: -1,
          height: 3,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.foreground,
        },
      },
    },
  },
  defaultVariants: { variant: 'default' },
}))

type TabsSlots =
  | 'list'
  | 'trigger'
  | 'triggerActive'
  | 'triggerPressed'
  | 'indicator'
  | 'triggerLabel'
  | 'triggerLabelActive'
  | 'triggerDisabled'
  | 'content'
type Layout = { x: number; width: number }
type Variant = NonNullable<RecipeVariants<typeof tabsRecipe>['variant']>
type Ctx = {
  value: string
  variant: Variant
  setValue: (v: string) => void
  styles: SlotStyles<TabsSlots>
  layouts: Map<string, Layout>
  reportLayout: (value: string, layout: Layout) => void
  layoutVersion: number
}
const TabsContext = createContext<Ctx | null>(null)

function useTabs(part: string) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Tabs>`)
  return ctx
}

export type TabsProps = ViewProps &
  RecipeVariants<typeof tabsRecipe> & {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    styles?: SlotOverrides<TabsSlots>
    children?: ReactNode
  }

export function Tabs({
  value: controlled,
  defaultValue = '',
  onValueChange,
  variant = 'default',
  styles,
  style,
  children,
  ...rest
}: TabsProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ?? uncontrolled
  const setValue = (next: string) => {
    if (controlled === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }
  const s = useRecipe(tabsRecipe, { variant }, styles)
  const layouts = useRef(new Map<string, Layout>()).current
  const [layoutVersion, setLayoutVersion] = useState(0)
  const reportLayout = useCallback(
    (v: string, layout: Layout) => {
      const prev = layouts.get(v)
      if (prev && prev.x === layout.x && prev.width === layout.width) return
      layouts.set(v, layout)
      setLayoutVersion((n) => n + 1)
    },
    [layouts],
  )
  return (
    <TabsContext.Provider
      value={{ value, variant, setValue, styles: s, layouts, reportLayout, layoutVersion }}
    >
      <View style={[s.root, style]} {...rest}>
        {children}
      </View>
    </TabsContext.Provider>
  )
}

const MOVE = { duration: 150, easing: Easing.out(Easing.cubic) }

function Indicator() {
  const { value, styles, layouts, layoutVersion } = useTabs('TabsList')
  const x = useSharedValue(0)
  const width = useSharedValue(0)
  const ready = useRef(false)

  useEffect(() => {
    const target = layouts.get(value)
    if (!target) return
    if (!ready.current) {
      // First layout: place without animating.
      x.value = target.x
      width.value = target.width
      ready.current = true
      return
    }
    x.value = withTiming(target.x, MOVE)
    width.value = withTiming(target.width, MOVE)
  }, [value, layoutVersion, layouts, x, width])

  const animated = useAnimatedStyle(() => ({
    width: width.value,
    transform: [{ translateX: x.value }],
  }))

  return <Animated.View pointerEvents="none" style={[styles.indicator, animated]} />
}

export type TabsListProps = ViewProps & {
  /** Pills scroll horizontally when they overflow. Default true. Ignored by other variants. */
  scrollable?: boolean
}

export function TabsList({ scrollable, style, children, ...rest }: TabsListProps) {
  const { styles, variant } = useTabs('TabsList')
  const scrolls = variant === 'default' && (scrollable ?? true)
  const list = (
    <View accessibilityRole="tablist" style={[styles.list, style]} {...rest}>
      {variant === 'default' ? null : <Indicator />}
      {children}
    </View>
  )
  if (!scrolls) return list
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
      {list}
    </ScrollView>
  )
}

export type TabsTriggerProps = Omit<PressableProps, 'style' | 'children'> & {
  value: string
  children: ReactNode
}

export function TabsTrigger({ value, disabled, children, onLayout, ...rest }: TabsTriggerProps) {
  const { value: active, setValue, styles, reportLayout } = useTabs('TabsTrigger')
  const selected = active === value
  const handleLayout = (e: LayoutChangeEvent) => {
    reportLayout(value, { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })
    onLayout?.(e)
  }
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected, disabled: disabled === true }}
      disabled={disabled}
      onLayout={handleLayout}
      onPress={() => setValue(value)}
      style={({ pressed }) => [
        styles.trigger,
        selected && styles.triggerActive,
        pressed && !selected && styles.triggerPressed,
        disabled && styles.triggerDisabled,
      ]}
      {...rest}
    >
      {typeof children === 'string' ? (
        <Text
          numberOfLines={1}
          style={[styles.triggerLabel, selected && styles.triggerLabelActive]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}

export function TabsContent({ value, style, children, ...rest }: ViewProps & { value: string }) {
  const { value: active, styles } = useTabs('TabsContent')
  if (active !== value) return null
  return (
    <View style={[styles.content, style]} {...rest}>
      {children}
    </View>
  )
}
