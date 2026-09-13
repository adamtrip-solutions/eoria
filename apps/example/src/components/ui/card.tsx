import { createContext, useContext, type ReactNode } from 'react'
import {
  Pressable,
  View,
  type PressableProps,
  type PressableStateCallbackType,
  type ViewProps,
} from 'react-native'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Text, type TextProps } from '@/components/ui/text'

/**
 * Surface tile. No hairline border: the default variant sits on the muted
 * surface colour, `elevated` floats on a soft shadow, `outline` is the
 * quiet fallback. Pass `onPress` to make the whole card tappable; give it an
 * `accessibilityLabel` then, since Pressable flattens the children for
 * screen readers.
 */
export const cardRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** No `overflow: hidden` here: it would clip the elevated shadow on iOS. */
    root: { borderRadius: theme.radius.xl },
    rootPressed: { opacity: 0.9 },
    header: { padding: theme.space[5], paddingBottom: 0, gap: theme.space[1] },
    title: {
      fontSize: theme.fontSize.lg,
      lineHeight: theme.lineHeight.lg,
      fontWeight: theme.fontWeight.semibold,
      letterSpacing: -0.2,
    },
    description: {
      color: theme.colors.mutedForeground,
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
    },
    content: { padding: theme.space[5] },
    footer: {
      paddingHorizontal: theme.space[5],
      paddingBottom: theme.space[5],
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[2],
    },
  },
  variants: {
    variant: {
      filled: { root: { backgroundColor: theme.colors.surface, overflow: 'hidden' } },
      elevated: {
        root: {
          backgroundColor: theme.colors.elevated,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        },
      },
      outline: {
        root: {
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: 'hidden',
        },
      },
    },
  },
  defaultVariants: { variant: 'filled' },
}))

type CardSlots = 'rootPressed' | 'header' | 'title' | 'description' | 'content' | 'footer'
const CardContext = createContext<SlotStyles<CardSlots> | null>(null)

function useCardStyles(part: string) {
  const ctx = useContext(CardContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Card>`)
  return ctx
}

export type CardProps = Omit<ViewProps, 'style'> &
  Pick<PressableProps, 'onPress' | 'onLongPress' | 'style'> &
  RecipeVariants<typeof cardRecipe> & { styles?: SlotOverrides<CardSlots>; children?: ReactNode }

export function Card({
  variant,
  styles,
  style,
  onPress,
  onLongPress,
  children,
  ...rest
}: CardProps) {
  const s = useRecipe(cardRecipe, { variant }, styles)
  const pressable = onPress !== undefined || onLongPress !== undefined
  return (
    <CardContext.Provider value={s}>
      {pressable ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          onLongPress={onLongPress}
          style={(state) => [
            s.root,
            state.pressed && s.rootPressed,
            typeof style === 'function' ? style(state) : style,
          ]}
          {...rest}
        >
          {children}
        </Pressable>
      ) : (
        <View
          style={[
            s.root,
            typeof style === 'function'
              ? style({ pressed: false } as PressableStateCallbackType)
              : style,
          ]}
          {...rest}
        >
          {children}
        </View>
      )}
    </CardContext.Provider>
  )
}

export function CardHeader({ style, ...rest }: ViewProps) {
  return <View style={[useCardStyles('CardHeader').header, style]} {...rest} />
}

export function CardTitle({ style, ...rest }: TextProps) {
  return (
    <Text accessibilityRole="header" style={[useCardStyles('CardTitle').title, style]} {...rest} />
  )
}

export function CardDescription({ style, ...rest }: TextProps) {
  return <Text style={[useCardStyles('CardDescription').description, style]} {...rest} />
}

export function CardContent({ style, ...rest }: ViewProps) {
  return <View style={[useCardStyles('CardContent').content, style]} {...rest} />
}

export function CardFooter({ style, ...rest }: ViewProps) {
  return <View style={[useCardStyles('CardFooter').footer, style]} {...rest} />
}
