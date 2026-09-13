import { createContext, useContext, useState, type ReactNode } from 'react'
import { Image, View, type ImageProps, type ViewProps } from 'react-native'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Text, type TextProps } from '@/components/ui/text'

export const avatarRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.muted,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: { width: '100%', height: '100%' },
    fallback: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.mutedForeground,
      textTransform: 'uppercase',
    },
  },
  variants: {
    size: {
      sm: {
        root: { width: 28, height: 28 },
        fallback: { fontSize: theme.fontSize.xs, lineHeight: theme.lineHeight.xs },
      },
      md: {},
      lg: {
        root: { width: 56, height: 56 },
        fallback: { fontSize: theme.fontSize.lg, lineHeight: theme.lineHeight.lg },
      },
      xl: {
        root: { width: 80, height: 80 },
        fallback: { fontSize: theme.fontSize['2xl'], lineHeight: theme.lineHeight['2xl'] },
      },
    },
    shape: {
      circle: {},
      rounded: { root: { borderRadius: theme.radius.md } },
    },
  },
  defaultVariants: { size: 'md', shape: 'circle' },
}))

type AvatarSlots = 'image' | 'fallback'
type Status = 'idle' | 'loading' | 'loaded' | 'error'
type Ctx = { styles: SlotStyles<AvatarSlots>; status: Status; setStatus: (s: Status) => void }
const AvatarContext = createContext<Ctx | null>(null)

function useAvatar(part: string) {
  const ctx = useContext(AvatarContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Avatar>`)
  return ctx
}

export type AvatarProps = ViewProps &
  RecipeVariants<typeof avatarRecipe> & {
    styles?: SlotOverrides<AvatarSlots>
    children?: ReactNode
  }

/**
 * Image with a fallback. Compose `<AvatarImage>` and `<AvatarFallback>`;
 * the fallback shows until the image loads and stays if it fails.
 * Give the root an `accessibilityLabel` (the person's name); the initials
 * are hidden from screen readers.
 */
export function Avatar({ size, shape, styles, style, children, ...rest }: AvatarProps) {
  const s = useRecipe(avatarRecipe, { size, shape }, styles)
  const [status, setStatus] = useState<Status>('idle')
  return (
    <AvatarContext.Provider value={{ styles: s, status, setStatus }}>
      <View accessible accessibilityRole="image" style={[s.root, style]} {...rest}>
        {children}
      </View>
    </AvatarContext.Provider>
  )
}

export function AvatarImage({ style, onLoadStart, onLoad, onError, ...rest }: ImageProps) {
  const { styles, status, setStatus } = useAvatar('AvatarImage')
  return (
    <Image
      style={[styles.image, status !== 'loaded' && { position: 'absolute', opacity: 0 }, style]}
      onLoadStart={() => {
        setStatus('loading')
        onLoadStart?.()
      }}
      onLoad={(e) => {
        setStatus('loaded')
        onLoad?.(e)
      }}
      onError={(e) => {
        setStatus('error')
        onError?.(e)
      }}
      {...rest}
    />
  )
}

export function AvatarFallback({ style, children, ...rest }: TextProps) {
  const { styles, status } = useAvatar('AvatarFallback')
  if (status === 'loaded') return null
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.fallback, style]}
      {...rest}
    >
      {children}
    </Text>
  )
}
