import { useState, type ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'
import { Image as ExpoImage, type ImageProps as ExpoImageProps } from 'expo-image'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'

/**
 * expo-image in a frame that holds its shape before the picture arrives. The frame is muted
 * while loading, the picture fades in over 150 ms, and a failed load shows a fallback in
 * place of a broken picture.
 */
export const imageRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** The frame. Give it a width, or let it stretch, and set `ratio`. */
    root: { overflow: 'hidden', backgroundColor: theme.colors.muted },
    image: { width: '100%', height: '100%' },
    fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  },
  variants: {
    rounded: {
      none: {},
      sm: { root: { borderRadius: theme.radius.sm } },
      md: { root: { borderRadius: theme.radius.md } },
      lg: { root: { borderRadius: theme.radius.lg } },
      /** Follows the card corner of the preset. */
      card: { root: { borderRadius: theme.radius.card } },
      full: { root: { borderRadius: theme.radius.full } },
    },
  },
  defaultVariants: { rounded: 'none' },
}))

type ImageSlots = 'image' | 'fallback'

export type ImageProps = Omit<ExpoImageProps, 'style' | 'alt'> &
  RecipeVariants<typeof imageRecipe> & {
    /** Read by screen readers. Leave it out for decoration and the image is hidden from them. */
    alt?: string
    /** Width divided by height, such as `16 / 9`. Without it the frame needs a height. */
    ratio?: number
    /** Shown when the source fails to load, such as an icon. The muted frame stays either way. */
    fallback?: ReactNode
    style?: ViewProps['style']
    styles?: SlotOverrides<ImageSlots>
  }

export function Image({
  alt,
  ratio,
  rounded,
  fallback,
  style,
  styles,
  transition = 150,
  contentFit = 'cover',
  onError,
  ...rest
}: ImageProps) {
  const [failed, setFailed] = useState(false)
  const s = useRecipe(imageRecipe, { rounded }, styles)
  return (
    <View
      accessible={alt !== undefined}
      accessibilityRole={alt !== undefined ? 'image' : undefined}
      accessibilityLabel={alt}
      accessibilityElementsHidden={alt === undefined}
      importantForAccessibility={alt === undefined ? 'no-hide-descendants' : 'yes'}
      style={[s.root, ratio !== undefined && { aspectRatio: ratio }, style]}
    >
      {failed ? (
        <View style={s.fallback}>{fallback}</View>
      ) : (
        <ExpoImage
          style={s.image}
          transition={transition}
          contentFit={contentFit}
          onError={(e) => {
            setFailed(true)
            onError?.(e)
          }}
          {...rest}
        />
      )}
    </View>
  )
}
