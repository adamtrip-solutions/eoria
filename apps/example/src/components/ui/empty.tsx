import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react'
import { View, type ViewProps } from 'react-native'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Text, headingFont, type TextProps } from '@/components/ui/text'

/**
 * Empty state: media, a title, a line of help and the way out. Centred, with
 * the text held to a readable width. `flexGrow` rather than `flex`, so it
 * fills a screen that has room and keeps its own height inside a Card or a
 * ScrollView, where `flex: 1` would collapse it.
 */
export const emptyRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.space[2],
      padding: theme.space[6],
    },
    media: { alignItems: 'center', justifyContent: 'center', marginBottom: theme.space[2] },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 28, height: 28, color: theme.colors.foreground },
    title: {
      maxWidth: 300,
      textAlign: 'center',
      fontSize: theme.fontSize.lg,
      lineHeight: theme.lineHeight.lg,
      fontWeight: theme.fontWeight.semibold,
      letterSpacing: -0.2,
      color: theme.colors.foreground,
      ...headingFont(theme),
    },
    description: {
      maxWidth: 300,
      textAlign: 'center',
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.mutedForeground,
    },
    /** Stacked and centred, primary first. */
    actions: { alignItems: 'center', gap: theme.space[2], marginTop: theme.space[3] },
  },
  variants: {
    /** Selected by `EmptyMedia`, not by the root. */
    media: {
      icon: {
        media: {
          width: theme.space[16],
          height: theme.space[16],
          borderRadius: theme.radius.card,
          backgroundColor: theme.colors.muted,
        },
      },
      plain: {
        icon: { width: 48, height: 48, color: theme.colors.mutedForeground },
      },
    },
  },
  defaultVariants: { media: 'icon' },
}))

type EmptySlots = 'media' | 'icon' | 'title' | 'description' | 'actions'

type Ctx = {
  styles: SlotStyles<EmptySlots>
  /** Kept raw so `EmptyMedia` can resolve the recipe again with its own variant. */
  overrides: SlotOverrides<EmptySlots> | undefined
}
const EmptyContext = createContext<Ctx | null>(null)

function useEmpty(part: string) {
  const ctx = useContext(EmptyContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Empty>`)
  return ctx
}

export type EmptyProps = ViewProps & {
  styles?: SlotOverrides<EmptySlots>
  children?: ReactNode
}

export function Empty({ styles, style, children, ...rest }: EmptyProps) {
  const s = useRecipe(emptyRecipe, {}, styles)
  return (
    <EmptyContext.Provider value={{ styles: s, overrides: styles }}>
      <View style={[s.root, style]} {...rest}>
        {children}
      </View>
    </EmptyContext.Provider>
  )
}

export type EmptyMediaProps = ViewProps & {
  /** `icon` sits the icon in a muted well. `plain` draws no well, for an illustration, an image or a larger icon. */
  variant?: NonNullable<RecipeVariants<typeof emptyRecipe>['media']>
  /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
  icon?: ReactElement<{ size?: number; color?: string }>
  children?: ReactNode
}

/** Decoration, so it is hidden from screen readers. The title carries the meaning. */
export function EmptyMedia({ variant = 'icon', icon, style, children, ...rest }: EmptyMediaProps) {
  const { overrides } = useEmpty('EmptyMedia')
  const s = useRecipe(emptyRecipe, { media: variant }, overrides)
  const iconNode = isValidElement(icon)
    ? cloneElement(icon, {
        size: getStyleValue(s.icon, 'width') as number | undefined,
        color: getStyleValue(s.icon, 'color') as string | undefined,
      })
    : null
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[s.media, style]}
      {...rest}
    >
      {iconNode}
      {children}
    </View>
  )
}

export function EmptyTitle({ style, ...rest }: TextProps) {
  return (
    <Text
      accessibilityRole="header"
      style={[useEmpty('EmptyTitle').styles.title, style]}
      {...rest}
    />
  )
}

export function EmptyDescription({ style, ...rest }: TextProps) {
  return <Text style={[useEmpty('EmptyDescription').styles.description, style]} {...rest} />
}

export function EmptyActions({ style, ...rest }: ViewProps) {
  return <View style={[useEmpty('EmptyActions').styles.actions, style]} {...rest} />
}
