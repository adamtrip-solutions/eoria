import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Pressable, View, type PressableProps, type ViewProps } from 'react-native'
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

export const accordionRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {},
    item: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[3],
      minHeight: 56,
      paddingVertical: theme.space[4],
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
    content: { paddingBottom: theme.space[4], gap: theme.space[2] },
    contentText: {
      color: theme.colors.mutedForeground,
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
    },
  },
  variants: {
    variant: {
      default: {},
      contained: {
        root: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.card,
          borderWidth: theme.stroke,
          borderColor: theme.colors.border,
          overflow: 'hidden',
        },
        item: { paddingHorizontal: theme.space[5] },
      },
    },
  },
  defaultVariants: { variant: 'default' },
}))

type AccordionSlots =
  | 'item'
  | 'trigger'
  | 'triggerLabel'
  | 'triggerPressed'
  | 'triggerDisabled'
  | 'chevron'
  | 'content'
  | 'contentText'

type Ctx = {
  styles: SlotStyles<AccordionSlots>
  isOpen: (value: string) => boolean
  toggle: (value: string) => void
  disabled: boolean
}
const AccordionContext = createContext<Ctx | null>(null)
type ItemCtx = { value: string; open: boolean; disabled: boolean }
const ItemContext = createContext<ItemCtx | null>(null)

function useAccordion(part: string) {
  const ctx = useContext(AccordionContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Accordion>`)
  return ctx
}
function useItem(part: string) {
  const ctx = useContext(ItemContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <AccordionItem>`)
  return ctx
}

const DURATION = 150
const EASING = Easing.out(Easing.cubic)

type SingleProps = {
  type?: 'single'
  value?: string | undefined
  defaultValue?: string
  onValueChange?: (value: string | undefined) => void
  /** Allow closing the open item. Default true. */
  collapsible?: boolean
}
type MultipleProps = {
  type: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  collapsible?: never
}

export type AccordionProps = ViewProps &
  RecipeVariants<typeof accordionRecipe> &
  (SingleProps | MultipleProps) & {
    disabled?: boolean
    styles?: SlotOverrides<AccordionSlots>
    children?: ReactNode
  }

const OWN_PROPS = new Set(['type', 'value', 'defaultValue', 'onValueChange', 'collapsible'])

export function Accordion(props: AccordionProps) {
  const { variant, disabled = false, styles, style, children, ...rest } = props
  const s = useRecipe(accordionRecipe, { variant }, styles)

  const [uncontrolled, setUncontrolled] = useState<string[]>(() => {
    if (rest.type === 'multiple') return rest.defaultValue ?? []
    return rest.defaultValue === undefined ? [] : [rest.defaultValue]
  })

  // Controlled when the `value` key is present, even if undefined (nothing open).
  const isControlled = 'value' in rest
  let open: string[]
  if (!isControlled) open = uncontrolled
  else if (rest.type === 'multiple') open = rest.value ?? []
  else open = rest.value === undefined ? [] : [rest.value]

  const toggle = (value: string) => {
    let next: string[]
    if (rest.type === 'multiple') {
      next = open.includes(value) ? open.filter((v) => v !== value) : [...open, value]
      if (!isControlled) setUncontrolled(next)
      rest.onValueChange?.(next)
    } else {
      const collapsible = rest.collapsible ?? true
      if (open.includes(value)) next = collapsible ? [] : open
      else next = [value]
      if (!isControlled) setUncontrolled(next)
      rest.onValueChange?.(next[0])
    }
  }

  const viewProps: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(rest)) {
    if (!OWN_PROPS.has(key)) viewProps[key] = val
  }

  return (
    <AccordionContext.Provider
      value={{ styles: s, isOpen: (v) => open.includes(v), toggle, disabled }}
    >
      <View style={[s.root, style]} {...(viewProps as ViewProps)}>
        {children}
      </View>
    </AccordionContext.Provider>
  )
}

export type AccordionItemProps = ViewProps & {
  value: string
  disabled?: boolean
  children?: ReactNode
}

export function AccordionItem({
  value,
  disabled: itemDisabled = false,
  style,
  children,
  ...rest
}: AccordionItemProps) {
  const { styles, isOpen, disabled } = useAccordion('AccordionItem')
  return (
    <ItemContext.Provider
      value={{ value, open: isOpen(value), disabled: itemDisabled || disabled }}
    >
      <Animated.View
        layout={LinearTransition.duration(DURATION).easing(EASING)}
        style={[styles.item, style]}
        {...rest}
      >
        {children}
      </Animated.View>
    </ItemContext.Provider>
  )
}

export type AccordionTriggerProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode
}

export function AccordionTrigger({ children, ...rest }: AccordionTriggerProps) {
  const { styles, toggle } = useAccordion('AccordionTrigger')
  const { value, open, disabled } = useItem('AccordionTrigger')
  const rotation = useSharedValue(open ? 225 : 45)
  useEffect(() => {
    rotation.value = withTiming(open ? 225 : 45, { duration: DURATION, easing: EASING })
  }, [open, rotation])
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open, disabled }}
      disabled={disabled}
      onPress={() => toggle(value)}
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
 * Mounted only while open. Fades in; sibling items shift with a layout
 * transition. Views below the Accordion do not animate unless they also set
 * `layout={LinearTransition}`.
 */
export function AccordionContent({ style, children, ...rest }: ViewProps) {
  const { styles } = useAccordion('AccordionContent')
  const { open } = useItem('AccordionContent')
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
