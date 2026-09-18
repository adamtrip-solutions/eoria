import { cloneElement, createContext, isValidElement, useContext, type ReactElement } from 'react'
import { StyleSheet, View, type ViewProps } from 'react-native'
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
 * Inline banner. Tinted variants layer a translucent wash of the accent
 * colour over the surface, the way iOS notices do, so text keeps full contrast.
 */
export const alertRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.space[3],
      padding: theme.space[4],
      borderRadius: theme.radius.card,
      borderWidth: theme.stroke,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    /** Wash layered under the content; only tinted variants give it an opacity. */
    tint: { opacity: 0 },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 20, height: 20, color: theme.colors.foreground, marginTop: 2 },
    body: { flex: 1, gap: 2 },
    title: {
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
      ...headingFont(theme),
    },
    description: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      color: theme.colors.mutedForeground,
    },
  },
  variants: {
    variant: {
      default: {},
      primary: {
        tint: { backgroundColor: theme.colors.primary, opacity: 0.12 },
        icon: { color: theme.colors.primary },
        title: { color: theme.colors.primary },
        description: { color: theme.colors.foreground },
      },
      destructive: {
        tint: { backgroundColor: theme.colors.destructive, opacity: 0.12 },
        icon: { color: theme.colors.destructive },
        title: { color: theme.colors.destructive },
        description: { color: theme.colors.foreground },
      },
      outline: {
        root: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: theme.colors.border,
        },
      },
    },
  },
  defaultVariants: { variant: 'default' },
}))

export type AlertSlots = 'tint' | 'icon' | 'body' | 'title' | 'description'

const AlertContext = createContext<SlotStyles<AlertSlots> | null>(null)

function useAlert(part: string) {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Alert>`)
  return ctx
}

export type AlertProps = ViewProps &
  RecipeVariants<typeof alertRecipe> & {
    /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
    icon?: ReactElement<{ size?: number; color?: string }>
    styles?: SlotOverrides<AlertSlots>
  }

/**
 * The root is one accessible element with the `alert` role, so a screen
 * reader announces title and description together when it lands on it.
 */
export function Alert({ variant, icon, styles, style, children, ...rest }: AlertProps) {
  const s = useRecipe(alertRecipe, { variant }, styles)
  const iconNode = isValidElement(icon)
    ? cloneElement(icon, {
        size: getStyleValue(s.icon, 'width') as number | undefined,
        color: getStyleValue(s.icon, 'color') as string | undefined,
      })
    : null
  return (
    <View accessible accessibilityRole="alert" style={[s.root, style]} {...rest}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.tint]} />
      {iconNode ? (
        <View style={{ marginTop: getStyleValue(s.icon, 'marginTop') }}>{iconNode}</View>
      ) : null}
      <AlertContext.Provider value={s}>
        <View style={s.body}>{children}</View>
      </AlertContext.Provider>
    </View>
  )
}

export function AlertTitle({ style, ...rest }: TextProps) {
  return <Text style={[useAlert('AlertTitle').title, style]} {...rest} />
}

export function AlertDescription({ style, ...rest }: TextProps) {
  return <Text style={[useAlert('AlertDescription').description, style]} {...rest} />
}
