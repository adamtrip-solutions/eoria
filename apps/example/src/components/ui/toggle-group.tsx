import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Pressable, View, type PressableProps, type ViewProps } from 'react-native'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Text } from '@/components/ui/text'

/**
 * Two-state button. On takes the foreground fill of a selected chip in Tabs,
 * so it reads as chosen on every preset. `ToggleGroup` joins several into one
 * control for a single choice or a set.
 */
export const toggleRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.space[2],
      borderRadius: theme.radius.control,
    },
    rootPressed: { opacity: 0.7 },
    rootDisabled: { opacity: 0.4 },
    label: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
    },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 18, height: 18, color: theme.colors.foreground },
  },
  variants: {
    variant: {
      default: { root: { backgroundColor: theme.colors.muted } },
      outline: { root: { borderWidth: 1, borderColor: theme.colors.border } },
    },
    size: {
      sm: {
        root: {
          minHeight: theme.control.sm,
          minWidth: theme.control.sm,
          paddingHorizontal: theme.space[3],
        },
        icon: { width: 16, height: 16 },
      },
      md: {
        root: {
          minHeight: theme.control.md,
          minWidth: theme.control.md,
          paddingHorizontal: theme.space[4],
        },
      },
      lg: {
        root: {
          minHeight: theme.control.lg,
          minWidth: theme.control.lg,
          paddingHorizontal: theme.space[5],
        },
        label: { fontSize: theme.fontSize.md, lineHeight: theme.lineHeight.md },
        icon: { width: 20, height: 20 },
      },
    },
    // Declared last so the on state wins over `variant`.
    pressed: {
      true: {
        root: { backgroundColor: theme.colors.foreground, borderColor: theme.colors.foreground },
        label: { color: theme.colors.background },
        icon: { color: theme.colors.background },
      },
      false: {},
    },
  },
  defaultVariants: { variant: 'default', size: 'md', pressed: false },
}))

export const toggleGroupRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** One outer corner for the whole control. The buttons inside are square. */
    root: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      borderRadius: theme.radius.control,
      overflow: 'hidden',
    },
    /** Layered over the root of every Toggle in the group. */
    item: { borderRadius: 0, borderWidth: 0 },
    divider: { width: 1, alignSelf: 'stretch', backgroundColor: theme.colors.border },
    rootDisabled: { opacity: 0.4 },
  },
  variants: {
    variant: {
      default: { root: { backgroundColor: theme.colors.muted } },
      outline: { root: { borderWidth: 1, borderColor: theme.colors.border } },
    },
    /** `full` stretches to the container and shares the width between the buttons. */
    width: {
      auto: {},
      full: { root: { alignSelf: 'stretch' }, item: { flexGrow: 1, flexBasis: 0 } },
    },
  },
  defaultVariants: { variant: 'default', width: 'auto' },
}))

type ToggleVariants = RecipeVariants<typeof toggleRecipe>
type GroupSlots = 'item' | 'divider' | 'rootDisabled'
type Ctx = {
  styles: SlotStyles<GroupSlots>
  variant: ToggleVariants['variant']
  size: ToggleVariants['size']
  isPressed: (value: string) => boolean
  toggle: (value: string) => void
  disabled: boolean
}
const ToggleGroupContext = createContext<Ctx | null>(null)

export type ToggleProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> &
  Omit<ToggleVariants, 'pressed'> & {
    /** Controlled state. Inside a ToggleGroup the group owns it. */
    pressed?: boolean
    defaultPressed?: boolean
    onPressedChange?: (pressed: boolean) => void
    /** Identifies the button inside a ToggleGroup. */
    value?: string
    /** A string gets the label style; anything else renders as is. */
    children?: ReactNode
    /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
    icon?: ReactElement<{ size?: number; color?: string }>
    styles?: SlotOverrides<'rootPressed' | 'rootDisabled' | 'label' | 'icon'>
  }

export function Toggle({
  pressed: controlled,
  defaultPressed = false,
  onPressedChange,
  value,
  variant,
  size,
  icon,
  disabled,
  styles,
  hitSlop,
  children,
  ...rest
}: ToggleProps) {
  const group = useContext(ToggleGroupContext)
  const [uncontrolled, setUncontrolled] = useState(defaultPressed)
  if (group && value === undefined) throw new Error('Toggle inside <ToggleGroup> needs a `value`')
  const on = group && value !== undefined ? group.isPressed(value) : (controlled ?? uncontrolled)
  const off = disabled === true || group?.disabled === true

  const s = useRecipe(
    toggleRecipe,
    { variant: group?.variant ?? variant, size: group?.size ?? size, pressed: on },
    styles,
  )
  // Dense presets have controls under 44pt; the slop makes up the difference.
  const height = (getStyleValue(s.root, 'minHeight') as number | undefined) ?? 44
  const slop = Math.max(0, (44 - height) / 2)

  const iconNode = isValidElement(icon)
    ? cloneElement(icon, {
        size: getStyleValue(s.icon, 'width') as number | undefined,
        color: getStyleValue(s.icon, 'color') as string | undefined,
      })
    : null

  return (
    <Pressable
      accessibilityRole="togglebutton"
      accessibilityState={{ checked: on, disabled: off }}
      disabled={off}
      hitSlop={hitSlop ?? { top: slop, bottom: slop }}
      onPress={() => {
        if (group && value !== undefined) return group.toggle(value)
        if (controlled === undefined) setUncontrolled(!on)
        onPressedChange?.(!on)
      }}
      style={({ pressed }) => [
        s.root,
        group?.styles.item,
        pressed && s.rootPressed,
        // A disabled group dims as a whole, so only the button's own flag counts here.
        disabled && s.rootDisabled,
      ]}
      {...rest}
    >
      {iconNode}
      {typeof children === 'string' ? (
        <Text numberOfLines={1} style={s.label}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}

type SingleProps = {
  type?: 'single'
  value?: string | undefined
  defaultValue?: string
  onValueChange?: (value: string | undefined) => void
}
type MultipleProps = {
  type: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

export type ToggleGroupProps = ViewProps &
  RecipeVariants<typeof toggleGroupRecipe> &
  (SingleProps | MultipleProps) & {
    /** Size of every Toggle in the group. */
    size?: ToggleVariants['size']
    /** Allow turning the last pressed button off. Default true. */
    allowEmpty?: boolean
    disabled?: boolean
    styles?: SlotOverrides<GroupSlots>
    children?: ReactNode
  }

const OWN_PROPS = new Set(['type', 'value', 'defaultValue', 'onValueChange'])

export function ToggleGroup(props: ToggleGroupProps) {
  const {
    variant,
    width,
    size,
    allowEmpty = true,
    disabled = false,
    styles,
    style,
    children,
    ...rest
  } = props
  const s = useRecipe(toggleGroupRecipe, { variant, width }, styles)

  const [uncontrolled, setUncontrolled] = useState<string[]>(() => {
    if (rest.type === 'multiple') return rest.defaultValue ?? []
    return rest.defaultValue === undefined ? [] : [rest.defaultValue]
  })

  // Controlled when the `value` key is present, even if undefined (nothing pressed).
  const isControlled = 'value' in rest
  let on: string[]
  if (!isControlled) on = uncontrolled
  else if (rest.type === 'multiple') on = rest.value ?? []
  else on = rest.value === undefined ? [] : [rest.value]

  const toggle = (value: string) => {
    let next: string[]
    if (on.includes(value)) next = on.filter((v) => v !== value)
    else next = rest.type === 'multiple' ? [...on, value] : [value]
    if (next.length === 0 && !allowEmpty) return
    if (!isControlled) setUncontrolled(next)
    if (rest.type === 'multiple') rest.onValueChange?.(next)
    else rest.onValueChange?.(next[0])
  }

  const viewProps: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(rest)) {
    if (!OWN_PROPS.has(key)) viewProps[key] = val
  }

  return (
    <ToggleGroupContext.Provider
      value={{ styles: s, variant, size, isPressed: (v) => on.includes(v), toggle, disabled }}
    >
      <View
        accessibilityState={{ disabled }}
        style={[s.root, disabled && s.rootDisabled, style]}
        {...(viewProps as ViewProps)}
      >
        {Children.toArray(children).map((child, i) => (
          <Fragment key={isValidElement(child) ? child.key : i}>
            {i > 0 ? <View style={s.divider} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
    </ToggleGroupContext.Provider>
  )
}
