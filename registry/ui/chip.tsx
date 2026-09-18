import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PressableProps,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { X } from 'lucide-react-native'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
} from '@eoria/core'
import { Text } from '@/components/ui/text'

/**
 * Pressable pill for filters, choices and removable tokens. Selected takes the
 * foreground fill, the same as the active pill in Tabs. Badge is the
 * display-only counterpart.
 */
export const chipRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /**
     * The frame. The press target and the close target sit inside it side by
     * side. No `overflow: hidden`, which would cut their hit slop off at the edge.
     */
    root: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.radius.control,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    body: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.space[2],
      minHeight: theme.control.sm,
      paddingHorizontal: theme.space[4],
    },
    /** The close target brings its own padding. */
    bodyDismissible: { paddingRight: 0 },
    label: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
    },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 16, height: 16, color: theme.colors.foreground },
    dismiss: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: theme.space[2],
      paddingRight: theme.space[3],
    },
    dismissPressed: { opacity: 0.5 },
    dismissIcon: { width: 14, height: 14, color: theme.colors.mutedForeground },
    /** Own View layered over the fill while pressed, as in Button. Rounded itself, since the frame does not clip. */
    rootPressed: {
      borderRadius: theme.radius.control,
      backgroundColor: theme.colors.foreground,
      opacity: 0.08,
    },
    rootDisabled: { opacity: 0.4 },
  },
  variants: {
    variant: {
      filled: { root: { backgroundColor: theme.colors.muted } },
      outline: { root: { borderColor: theme.colors.border } },
    },
    size: {
      sm: {
        body: {
          gap: theme.space[1],
          minHeight: theme.control.sm - theme.space[2],
          paddingHorizontal: theme.space[3],
        },
        label: { fontSize: theme.fontSize.xs, lineHeight: theme.lineHeight.xs },
        icon: { width: 14, height: 14 },
        dismiss: { paddingRight: theme.space[2] },
        dismissIcon: { width: 12, height: 12 },
      },
      md: {},
    },
    // Declared after `variant` so the selected fill wins over both looks.
    selected: {
      true: {
        root: { backgroundColor: theme.colors.foreground, borderColor: theme.colors.foreground },
        label: { color: theme.colors.background },
        icon: { color: theme.colors.background },
        dismissIcon: { color: theme.colors.background },
        rootPressed: { backgroundColor: theme.colors.background, opacity: 0.16 },
      },
      false: {},
    },
  },
  defaultVariants: { variant: 'filled', size: 'md', selected: false },
}))

export const chipGroupRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  },
  variants: {
    /** One line inside a horizontal scroller instead of wrapping. */
    scroll: {
      true: { root: { flexWrap: 'nowrap' } },
      false: {},
    },
  },
  defaultVariants: { scroll: false },
}))

type ChipSlots =
  | 'body'
  | 'bodyDismissible'
  | 'label'
  | 'icon'
  | 'dismiss'
  | 'dismissPressed'
  | 'dismissIcon'
  | 'rootPressed'
  | 'rootDisabled'
type ChipLook = Pick<RecipeVariants<typeof chipRecipe>, 'variant' | 'size'>

type GroupCtx = ChipLook & {
  type: 'single' | 'multiple'
  isSelected: (value: string) => boolean
  toggle: (value: string) => void
  disabled: boolean
}
const ChipGroupContext = createContext<GroupCtx | null>(null)

const PRESS = { duration: 90, easing: Easing.out(Easing.quad) }
/** Apple's minimum touch target, in points. */
const MIN_TARGET = 44
/**
 * Widens the close target to about 44pt. It reaches into the space beside the
 * chip, where nothing else takes presses.
 */
const DISMISS_SLOP = 10

export type ChipProps = Omit<PressableProps, 'style' | 'children'> &
  ChipLook & {
    children?: ReactNode
    /** Identifies the chip inside a `ChipGroup`, which then owns `selected`. */
    value?: string
    selected?: boolean
    /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
    icon?: ReactElement<{ size?: number; color?: string }>
    /** Adds a close target after the label. It is a button of its own, not part of the chip's press. */
    onDismiss?: () => void
    /** Read out for the close target. Defaults to "Remove" plus the label when the label is a string. */
    dismissLabel?: string
    /** Per-slot style overrides, merged last. */
    styles?: SlotOverrides<ChipSlots>
  }

export function Chip({
  children,
  value,
  selected: selectedProp = false,
  variant,
  size,
  icon,
  onDismiss,
  dismissLabel,
  styles,
  disabled,
  accessibilityState,
  onPress,
  onPressIn,
  onPressOut,
  hitSlop,
  ...rest
}: ChipProps) {
  const group = useContext(ChipGroupContext)
  const grouped = group !== null && value !== undefined
  const selected = grouped ? group.isSelected(value) : selectedProp
  const off = disabled === true || (group?.disabled ?? false)
  const s = useRecipe(
    chipRecipe,
    { variant: variant ?? group?.variant, size: size ?? group?.size, selected },
    styles,
  )

  const scale = useSharedValue(1)
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const [pressed, setPressed] = useState(false)

  const iconNode = isValidElement(icon)
    ? cloneElement(icon, {
        size: getStyleValue(s.icon, 'width') as number | undefined,
        color: getStyleValue(s.icon, 'color') as string | undefined,
      })
    : null
  const text = typeof children === 'string' || typeof children === 'number' ? `${children}` : ''
  // Chips are shorter than a touch target. The slop makes up the difference.
  const height = (getStyleValue(s.body, 'minHeight') as number | undefined) ?? MIN_TARGET
  const slop = Math.max(0, Math.ceil((MIN_TARGET - height) / 2))

  // In a group the chip is a radio or a checkbox. Alone it is a button that reports
  // `selected`, or plain text when nothing happens on press, as with a removable token.
  const interactive = grouped || onPress !== undefined
  const role = grouped ? (group.type === 'single' ? 'radio' : 'checkbox') : 'button'
  const state = grouped ? { checked: selected } : { selected }

  return (
    <Animated.View style={[s.root, press, off && s.rootDisabled]}>
      <Pressable
        accessibilityRole={interactive ? role : 'text'}
        hitSlop={hitSlop ?? { top: slop, bottom: slop }}
        {...rest}
        accessibilityState={
          interactive ? { ...accessibilityState, ...state, disabled: off } : accessibilityState
        }
        disabled={off || !interactive}
        onPress={(e) => {
          if (grouped) group.toggle(value)
          onPress?.(e)
        }}
        onPressIn={(e) => {
          scale.value = withTiming(0.97, PRESS)
          setPressed(true)
          onPressIn?.(e)
        }}
        onPressOut={(e) => {
          scale.value = withTiming(1, PRESS)
          setPressed(false)
          onPressOut?.(e)
        }}
        style={[s.body, onDismiss ? s.bodyDismissible : null]}
      >
        {iconNode}
        {text ? <Text style={s.label}>{text}</Text> : children}
      </Pressable>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dismissLabel ?? (text ? `Remove ${text}` : 'Remove')}
          accessibilityState={{ disabled: off }}
          disabled={off}
          hitSlop={{ top: slop, bottom: slop, right: DISMISS_SLOP }}
          onPress={onDismiss}
          style={({ pressed: closing }) => [s.dismiss, closing && s.dismissPressed]}
        >
          <X
            size={getStyleValue(s.dismissIcon, 'width') as number | undefined}
            color={getStyleValue(s.dismissIcon, 'color') as string | undefined}
          />
        </Pressable>
      ) : null}
      {pressed ? (
        // Tint layered over the fill, so both looks and the selected state darken the same way.
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.rootPressed]} />
      ) : null}
    </Animated.View>
  )
}

type SingleProps = {
  type?: 'single'
  value?: string | undefined
  defaultValue?: string
  onValueChange?: (value: string) => void
}
type MultipleProps = {
  type: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

export type ChipGroupProps = ViewProps &
  ChipLook &
  (SingleProps | MultipleProps) & {
    /** One line that scrolls sideways instead of wrapping. */
    scroll?: boolean
    /** Passed to the scroller when `scroll` is set. */
    scrollProps?: ScrollViewProps
    disabled?: boolean
    styles?: SlotOverrides<never>
    children?: ReactNode
  }

const OWN_PROPS = new Set(['type', 'value', 'defaultValue', 'onValueChange'])

/**
 * Owns the selection of the chips inside it. `single` behaves as a radio
 * group, so pressing the selected chip keeps it selected. `multiple` toggles
 * each chip like a checkbox. `variant` and `size` set here reach every chip
 * that does not set its own.
 */
export function ChipGroup(props: ChipGroupProps) {
  const {
    variant,
    size,
    scroll = false,
    scrollProps,
    disabled = false,
    styles,
    style,
    children,
    ...rest
  } = props
  const s = useRecipe(chipGroupRecipe, { scroll }, styles)

  const [uncontrolled, setUncontrolled] = useState<string[]>(() => {
    if (rest.type === 'multiple') return rest.defaultValue ?? []
    return rest.defaultValue === undefined ? [] : [rest.defaultValue]
  })

  // Controlled when the `value` key is present, even if undefined (nothing selected).
  const isControlled = 'value' in rest
  let current: string[]
  if (!isControlled) current = uncontrolled
  else if (rest.type === 'multiple') current = rest.value ?? []
  else current = rest.value === undefined ? [] : [rest.value]

  const toggle = (value: string) => {
    if (rest.type === 'multiple') {
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      if (!isControlled) setUncontrolled(next)
      rest.onValueChange?.(next)
    } else {
      if (current.includes(value)) return
      if (!isControlled) setUncontrolled([value])
      rest.onValueChange?.(value)
    }
  }

  const viewProps: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(rest)) {
    if (!OWN_PROPS.has(key)) viewProps[key] = val
  }

  const type = rest.type ?? 'single'
  const list = (
    <View
      accessibilityRole={type === 'single' ? 'radiogroup' : undefined}
      accessibilityState={{ disabled }}
      style={[s.root, style]}
      {...(viewProps as ViewProps)}
    >
      {children}
    </View>
  )
  return (
    <ChipGroupContext.Provider
      value={{
        type,
        variant,
        size,
        disabled,
        isSelected: (v) => current.includes(v),
        toggle,
      }}
    >
      {scroll ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
          {...scrollProps}
        >
          {list}
        </ScrollView>
      ) : (
        list
      )}
    </ChipGroupContext.Provider>
  )
}
