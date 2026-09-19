import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  I18nManager,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Text, type TextProps } from '@/components/ui/text'

/**
 * List row in the iOS Settings idiom: media, a title with an optional
 * description, then a value, a control or a chevron. Pass `onPress` to make the
 * whole row one button; it then fills with `accent` while pressed, like a menu
 * row. Without `onPress` the row is a plain View, so a Switch inside it stays
 * its own element for screen readers.
 */
export const itemRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
    },
    rootPressed: { backgroundColor: theme.colors.accent },
    rootDisabled: { opacity: 0.5 },
    content: { flex: 1, justifyContent: 'center' },
    title: {
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.foreground,
    },
    description: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      color: theme.colors.mutedForeground,
    },
    trailing: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
    /** String children of `ItemTrailing`, the value of the row. */
    trailingText: {
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.mutedForeground,
    },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    chevron: { width: 18, height: 18, color: theme.colors.mutedForeground },
    /** Hairline under every row of an `ItemGroup` but the last. The row sets its leading inset. */
    separator: {
      position: 'absolute',
      bottom: 0,
      end: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
  },
  variants: {
    size: {
      sm: {
        root: { minHeight: Math.max(44, theme.control.sm) },
        title: { fontSize: theme.fontSize.sm, lineHeight: theme.lineHeight.sm },
        description: { fontSize: theme.fontSize.xs, lineHeight: theme.lineHeight.xs },
        trailingText: { fontSize: theme.fontSize.sm, lineHeight: theme.lineHeight.sm },
      },
      md: { root: { minHeight: Math.max(44, theme.control.md) } },
      lg: {
        root: { minHeight: Math.max(44, theme.control.lg), paddingVertical: theme.space[3] },
        title: { fontWeight: theme.fontWeight.medium },
      },
    },
    /**
     * Set by `ItemGroup`. The row paints the group fill itself, so a Swipeable
     * around it covers the actions underneath.
     */
    contained: {
      true: { root: { backgroundColor: theme.colors.surface } },
      false: {},
    },
  },
  defaultVariants: { size: 'md', contained: false },
}))

export const itemMediaRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { alignItems: 'center', justifyContent: 'center' },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 18, height: 18, color: theme.colors.foreground },
  },
  variants: {
    variant: {
      /** The icon sits in a muted well. */
      icon: {
        root: {
          width: 32,
          height: 32,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
        },
      },
      /** An `Avatar` child. It brings its own size and shape. */
      avatar: {},
      image: {
        root: {
          width: 48,
          height: 48,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
          overflow: 'hidden',
        },
      },
    },
  },
  defaultVariants: { variant: 'icon' },
}))

export const itemGroupRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { gap: theme.space[2] },
    /** The contained list. Clips the first and last row to its corners. */
    list: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      borderWidth: theme.stroke,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    label: {
      paddingHorizontal: theme.space[4],
      fontSize: theme.fontSize.xs,
      lineHeight: theme.lineHeight.xs,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    footer: {
      paddingHorizontal: theme.space[4],
      fontSize: theme.fontSize.xs,
      lineHeight: theme.lineHeight.xs,
      color: theme.colors.mutedForeground,
    },
  },
  variants: {},
  defaultVariants: {},
}))

type ItemSlots =
  | 'rootPressed'
  | 'rootDisabled'
  | 'content'
  | 'title'
  | 'description'
  | 'trailing'
  | 'trailingText'
  | 'chevron'
  | 'separator'
type ItemCtx = {
  styles: SlotStyles<ItemSlots>
  /** `ItemMedia` reports its width so the separator can start at the title. */
  reportMedia: (width: number) => void
}
const ItemContext = createContext<ItemCtx | null>(null)

function useItem(part: string) {
  const ctx = useContext(ItemContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Item>`)
  return ctx
}

type GroupSlots = 'list' | 'label' | 'footer'
const GroupContext = createContext<SlotStyles<GroupSlots> | null>(null)
/** Position of a row inside `ItemGroup`. Null outside a group. */
const GroupRowContext = createContext<{ last: boolean } | null>(null)

function useGroupStyles(part: string) {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <ItemGroup>`)
  return ctx
}

export type ItemProps = Omit<ViewProps, 'style'> &
  Pick<PressableProps, 'onPress' | 'onLongPress' | 'disabled'> &
  Pick<RecipeVariants<typeof itemRecipe>, 'size'> & {
    styles?: SlotOverrides<ItemSlots>
    style?: StyleProp<ViewStyle>
    children?: ReactNode
  }

export function Item({
  size,
  styles,
  style,
  onPress,
  onLongPress,
  disabled,
  accessible,
  accessibilityState,
  children,
  ...rest
}: ItemProps) {
  const row = useContext(GroupRowContext)
  const s = useRecipe(itemRecipe, { size, contained: row !== null }, styles)
  const [mediaWidth, setMediaWidth] = useState(0)
  const reportMedia = useCallback((width: number) => setMediaWidth(width), [])

  const padding = (getStyleValue(s.root, 'paddingHorizontal') as number | undefined) ?? 0
  const gap = (getStyleValue(s.root, 'gap') as number | undefined) ?? 0
  const separator =
    row && !row.last ? (
      <View
        pointerEvents="none"
        style={[s.separator, { start: padding + (mediaWidth > 0 ? mediaWidth + gap : 0) }]}
      />
    ) : null

  const pressable = onPress !== undefined || onLongPress !== undefined
  return (
    <ItemContext.Provider value={{ styles: s, reportMedia }}>
      {pressable ? (
        // No `accessibilityLabel` by default, so the screen reader reads the text
        // inside the row in order, which is title, description and trailing value.
        <Pressable
          accessibilityRole="button"
          accessible={accessible}
          accessibilityState={{ ...accessibilityState, disabled: disabled === true }}
          disabled={disabled}
          onPress={onPress}
          onLongPress={onLongPress}
          style={({ pressed }) => [
            s.root,
            pressed && s.rootPressed,
            disabled && s.rootDisabled,
            style,
          ]}
          {...rest}
        >
          {children}
          {separator}
        </Pressable>
      ) : (
        <View
          // A Swipeable hands its actions to the row. They only reach a screen
          // reader on an accessible element, so the row becomes one then.
          accessible={accessible ?? (rest.accessibilityActions ? true : undefined)}
          accessibilityState={accessibilityState}
          style={[s.root, disabled && s.rootDisabled, style]}
          {...rest}
        >
          {children}
          {separator}
        </View>
      )}
    </ItemContext.Provider>
  )
}

export type ItemMediaProps = ViewProps &
  RecipeVariants<typeof itemMediaRecipe> & {
    styles?: SlotOverrides<'icon'>
    children?: ReactNode
  }

/**
 * Leading slot. `icon` takes any element accepting `size` and `color`, e.g. a
 * lucide icon, and sets both. `avatar` and `image` render the child as is.
 */
export function ItemMedia({
  variant = 'icon',
  styles,
  style,
  onLayout,
  children,
  ...rest
}: ItemMediaProps) {
  const { reportMedia } = useItem('ItemMedia')
  const s = useRecipe(itemMediaRecipe, { variant }, styles)
  // The recipe width places the separator before the first layout pass; `onLayout`
  // corrects it for an avatar or a `style` of another size.
  const known = getStyleValue(s.root, 'width')
  useLayoutEffect(() => {
    if (typeof known === 'number') reportMedia(known)
    return () => reportMedia(0)
  }, [known, reportMedia])
  const handleLayout = (e: LayoutChangeEvent) => {
    reportMedia(e.nativeEvent.layout.width)
    onLayout?.(e)
  }
  const icon =
    variant === 'icon' && isValidElement(children)
      ? cloneElement(children as ReactElement<{ size?: number; color?: string }>, {
          size: getStyleValue(s.icon, 'width') as number | undefined,
          color: getStyleValue(s.icon, 'color') as string | undefined,
        })
      : children
  return (
    <View onLayout={handleLayout} style={[s.root, style]} {...rest}>
      {icon}
    </View>
  )
}

export function ItemContent({ style, ...rest }: ViewProps) {
  return <View style={[useItem('ItemContent').styles.content, style]} {...rest} />
}

export function ItemTitle({ style, ...rest }: TextProps) {
  return <Text numberOfLines={1} style={[useItem('ItemTitle').styles.title, style]} {...rest} />
}

export function ItemDescription({ style, ...rest }: TextProps) {
  return (
    <Text
      numberOfLines={2}
      style={[useItem('ItemDescription').styles.description, style]}
      {...rest}
    />
  )
}

/** Trailing slot. A string renders as the value of the row; anything else renders as is. */
export function ItemTrailing({ style, children, ...rest }: ViewProps) {
  const { styles } = useItem('ItemTrailing')
  return (
    <View style={[styles.trailing, style]} {...rest}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text numberOfLines={1} style={styles.trailingText}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}

/** Disclosure chevron. Decorative, and mirrored in right-to-left layouts. */
export function ItemChevron({ style, ...rest }: ViewProps) {
  const { styles } = useItem('ItemChevron')
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[I18nManager.isRTL && { transform: [{ scaleX: -1 }] }, style]}
      {...rest}
    >
      <ChevronRight
        size={getStyleValue(styles.chevron, 'width') as number | undefined}
        color={getStyleValue(styles.chevron, 'color') as string | undefined}
      />
    </View>
  )
}

export type ItemGroupProps = ViewProps & {
  styles?: SlotOverrides<GroupSlots>
  children?: ReactNode
}

/**
 * Contained list. Every direct child is one row, so wrappers such as Swipeable
 * keep their separator and their place. `ItemGroupLabel` and `ItemGroupFooter`
 * have to be direct children too; they render outside the container.
 */
export function ItemGroup({ styles, style, children, ...rest }: ItemGroupProps) {
  const s = useRecipe(itemGroupRecipe, {}, styles)
  const labels: ReactNode[] = []
  const footers: ReactNode[] = []
  const rows: ReactNode[] = []
  for (const child of Children.toArray(children)) {
    if (isValidElement(child) && child.type === ItemGroupLabel) labels.push(child)
    else if (isValidElement(child) && child.type === ItemGroupFooter) footers.push(child)
    else rows.push(child)
  }
  return (
    <GroupContext.Provider value={s}>
      <View style={[s.root, style]} {...rest}>
        {labels}
        <View style={s.list}>
          {rows.map((child, i) => (
            <GroupRowContext.Provider
              key={isValidElement(child) ? child.key : i}
              value={{ last: i === rows.length - 1 }}
            >
              {child}
            </GroupRowContext.Provider>
          ))}
        </View>
        {footers}
      </View>
    </GroupContext.Provider>
  )
}

/** Section header above the container. */
export function ItemGroupLabel({ style, ...rest }: TextProps) {
  return (
    <Text
      accessibilityRole="header"
      style={[useGroupStyles('ItemGroupLabel').label, style]}
      {...rest}
    />
  )
}

/** Footnote under the container. */
export function ItemGroupFooter({ style, ...rest }: TextProps) {
  return <Text style={[useGroupStyles('ItemGroupFooter').footer, style]} {...rest} />
}
