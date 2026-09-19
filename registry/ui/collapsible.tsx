import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  Pressable,
  type AccessibilityState,
  type PressableProps,
  type ViewProps,
} from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
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
 * One section that opens and closes, for "show more" and optional form parts.
 * The motion mirrors accordion.tsx, which keeps its timings private. The content
 * mounts only while open and fades in, and the root shifts with a layout transition.
 */
export const collapsibleRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {},
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[3],
      minHeight: 44,
    },
    triggerLabel: {
      flex: 1,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.medium,
    },
    triggerPressed: { opacity: 0.7 },
    triggerDisabled: { opacity: 0.5 },
    /** Chevron drawn with two borders, rotated. `width` sets its size. */
    chevron: {
      width: 10,
      height: 10,
      borderRightWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: theme.colors.mutedForeground,
      marginTop: -4,
    },
    content: { paddingTop: theme.space[2], gap: theme.space[2] },
    contentText: {
      color: theme.colors.mutedForeground,
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
    },
  },
  variants: {},
  defaultVariants: {},
}))

type CollapsibleSlots =
  | 'trigger'
  | 'triggerLabel'
  | 'triggerPressed'
  | 'triggerDisabled'
  | 'chevron'
  | 'content'
  | 'contentText'
type Ctx = {
  styles: SlotStyles<CollapsibleSlots>
  open: boolean
  toggle: () => void
  disabled: boolean
}
const CollapsibleContext = createContext<Ctx | null>(null)

function useCollapsible(part: string) {
  const ctx = useContext(CollapsibleContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Collapsible>`)
  return ctx
}

const DURATION = 150
const EASING = Easing.out(Easing.cubic)

export type CollapsibleProps = ViewProps &
  RecipeVariants<typeof collapsibleRecipe> & {
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    disabled?: boolean
    styles?: SlotOverrides<CollapsibleSlots>
    children?: ReactNode
  }

export function Collapsible({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  styles,
  style,
  children,
  ...rest
}: CollapsibleProps) {
  const s = useRecipe(collapsibleRecipe, {}, styles)
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ?? uncontrolled
  const toggle = () => {
    if (controlled === undefined) setUncontrolled(!open)
    onOpenChange?.(!open)
  }
  return (
    <CollapsibleContext.Provider value={{ styles: s, open, toggle, disabled }}>
      <Animated.View
        layout={LinearTransition.duration(DURATION).easing(EASING)}
        style={[s.root, style]}
        {...rest}
      >
        {children}
      </Animated.View>
    </CollapsibleContext.Provider>
  )
}

type TriggerChild = ReactElement<{
  onPress?: (...args: unknown[]) => void
  disabled?: boolean | null
  accessibilityState?: AccessibilityState
}>

export type CollapsibleTriggerProps = Omit<PressableProps, 'style' | 'children'> & {
  asChild?: boolean
  children: TriggerChild | ReactNode
}

/**
 * A row with a label and a chevron. With `asChild`, injects `onPress` and the
 * `expanded` state into the single child instead, e.g. a ghost Button.
 */
export function CollapsibleTrigger({ asChild, children, ...rest }: CollapsibleTriggerProps) {
  const { styles, open, toggle, disabled } = useCollapsible('CollapsibleTrigger')
  const rotation = useSharedValue(open ? 225 : 45)
  useEffect(() => {
    rotation.value = withTiming(open ? 225 : 45, { duration: DURATION, easing: EASING })
  }, [open, rotation])
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  if (asChild && isValidElement(children)) {
    const child = Children.only(children) as TriggerChild
    return cloneElement(child, {
      disabled: child.props.disabled || disabled,
      accessibilityState: { ...child.props.accessibilityState, expanded: open },
      onPress: (...args: unknown[]) => {
        child.props.onPress?.(...args)
        toggle()
      },
    })
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open, disabled }}
      disabled={disabled}
      onPress={toggle}
      style={({ pressed }) => [
        styles.trigger,
        pressed && styles.triggerPressed,
        disabled && styles.triggerDisabled,
      ]}
      {...rest}
    >
      {typeof children === 'string' ? (
        <Text style={styles.triggerLabel}>{children}</Text>
      ) : (
        children
      )}
      <Animated.View style={[styles.chevron, chevron]} />
    </Pressable>
  )
}

/**
 * Mounted only while open. Fades in; the Collapsible shifts with a layout
 * transition. Views below it do not animate unless they also set
 * `layout={LinearTransition}`.
 */
export function CollapsibleContent({ style, children, ...rest }: ViewProps) {
  const { styles, open } = useCollapsible('CollapsibleContent')
  if (!open) return null
  return (
    <Animated.View
      entering={FadeIn.duration(DURATION)}
      exiting={FadeOut.duration(DURATION / 2)}
      style={[styles.content, style]}
      {...rest}
    >
      {typeof children === 'string' ? <Text style={styles.contentText}>{children}</Text> : children}
    </Animated.View>
  )
}
