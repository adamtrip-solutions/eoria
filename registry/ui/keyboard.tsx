import { forwardRef, type ReactNode } from 'react'
import { StyleSheet, View, type ViewProps } from 'react-native'
import { useUnistyles } from 'react-native-unistyles'
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  KeyboardToolbar as ControllerToolbar,
  type KeyboardAwareScrollViewProps,
  type KeyboardAwareScrollViewRef,
  type KeyboardToolbarProps as ControllerToolbarProps,
} from 'react-native-keyboard-controller'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'

/**
 * Three keyboard helpers on react-native-keyboard-controller, which moves views with the
 * keyboard frame by frame on both platforms. `KeyboardScrollView` keeps the focused field
 * in view, `KeyboardFooter` pins an action above the keyboard, and `KeyboardToolbar` adds
 * previous, next and done. All three need `KeyboardProvider` at the root of the app.
 */
export const keyboardRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** The footer bar. */
    root: {
      gap: theme.space[2],
      paddingHorizontal: theme.space[4],
      paddingTop: theme.space[3],
      backgroundColor: theme.colors.background,
    },
    /** Content container of `KeyboardScrollView`. */
    scrollContent: { flexGrow: 1 },
  },
  variants: {
    /** `bordered` draws a hairline over content that scrolls underneath. */
    variant: {
      plain: {},
      bordered: {
        root: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
        },
      },
    },
  },
  defaultVariants: { variant: 'plain' },
}))

export type KeyboardScrollViewProps = KeyboardAwareScrollViewProps & {
  styles?: SlotOverrides<'scrollContent'>
}

/** A ScrollView that scrolls the focused field clear of the keyboard, with room to breathe. */
export const KeyboardScrollView = forwardRef<KeyboardAwareScrollViewRef, KeyboardScrollViewProps>(
  function KeyboardScrollView(
    { styles, contentContainerStyle, bottomOffset, keyboardShouldPersistTaps = 'handled', ...rest },
    ref,
  ) {
    const { theme } = useUnistyles()
    const s = useRecipe(keyboardRecipe, {}, styles)
    return (
      <KeyboardAwareScrollView
        ref={ref}
        bottomOffset={bottomOffset ?? theme.space[6]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentContainerStyle={[s.scrollContent, contentContainerStyle]}
        {...rest}
      />
    )
  },
)

export type KeyboardFooterProps = ViewProps &
  RecipeVariants<typeof keyboardRecipe> & {
    /**
     * Bottom safe-area inset, from `useSafeAreaInsets().bottom`. It pads the bar while the
     * keyboard is closed and is given back once the keyboard covers the home indicator.
     */
    bottomInset?: number
    styles?: SlotOverrides<never>
    children?: ReactNode
  }

/** Pins its children to the bottom of the screen and rides up with the keyboard. */
export function KeyboardFooter({
  variant,
  bottomInset = 0,
  styles,
  style,
  children,
  ...rest
}: KeyboardFooterProps) {
  const { theme } = useUnistyles()
  const s = useRecipe(keyboardRecipe, { variant }, styles)
  return (
    <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
      <View style={[s.root, { paddingBottom: bottomInset + theme.space[3] }, style]} {...rest}>
        {children}
      </View>
    </KeyboardStickyView>
  )
}

export type KeyboardToolbarProps = Omit<ControllerToolbarProps, 'theme'>

/**
 * Previous, next and done above the keyboard, for forms with several fields. Render it once,
 * after the scroll view. The library takes a colour set per scheme. Unistyles has already
 * picked the scheme, so both get the active theme.
 */
export function KeyboardToolbar(props: KeyboardToolbarProps) {
  const { theme } = useUnistyles()
  const colors = {
    primary: theme.colors.primary,
    disabled: theme.colors.mutedForeground,
    background: theme.colors.elevated,
    ripple: theme.colors.accent,
  }
  return <ControllerToolbar theme={{ light: colors, dark: colors }} {...props} />
}
